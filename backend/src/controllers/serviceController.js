const prisma = require('../config/db');
const { getIO } = require('../config/socket');

// আপনার schema এর enum RequestType এর সাথে মিল রেখে
const ALLOWED_TYPES = ['CALL_WAITER', 'WATER', 'BILL', 'OTHER'];
const ALLOWED_STATUS = ['PENDING', 'RESOLVED'];
const COOLDOWN_MS = 20 * 1000; // ২০ সেকেন্ড কুলডাউন
const MAX_MESSAGE = 120;

/* ------------------------------------------------------------------
 * helper: টেবিল খোঁজা
 * Table.tableNumber হলো String @unique, তাই আগে সেটা দিয়ে খুঁজছি।
 * না পেলে সংখ্যা হলে DB id দিয়ে খুঁজছি।
 * ------------------------------------------------------------------ */
const findTable = async (rawNumber, rawId) => {
  const value = String(rawNumber ?? rawId ?? '').trim();
  if (!value) return null;

  const byNumber = await prisma.table.findUnique({ where: { tableNumber: value } });
  if (byNumber) return byNumber;

  const asId = Number(value);
  if (Number.isInteger(asId) && asId > 0) {
    return prisma.table.findUnique({ where: { id: asId } });
  }
  return null;
};

const tableSelect = { select: { id: true, tableNumber: true } };

/* ------------------------------------------------------------------
 * POST /api/service-requests          (customer)
 * body: { tableId, tableNumber, type, message }
 * ------------------------------------------------------------------ */
exports.createServiceRequest = async (req, res) => {
  try {
    const { tableId, tableNumber } = req.body;

    let rawType = req.body.type;
    // ফ্রন্টএন্ডের 'CUSTOM' কে ব্যাকএন্ডের 'OTHER'-এ রূপান্তর
    if (rawType === 'CUSTOM') rawType = 'OTHER';
    // ফ্রন্টএন্ডের 'WAITER'-কে স্কিমার 'CALL_WAITER'-এ রূপান্তর (Bug Fix)
    if (rawType === 'WAITER') rawType = 'CALL_WAITER';

    const type = rawType;
    const message = String(req.body.message || '').trim().slice(0, MAX_MESSAGE);

    if (!ALLOWED_TYPES.includes(type)) {
      return res.status(400).json({ success: false, message: 'Invalid request type.' });
    }
    if (type === 'OTHER' && !message) {
      return res.status(400).json({ success: false, message: 'Note khali rakha jabe na.' });
    }

    const table = await findTable(tableNumber, tableId);
    if (!table) {
      return res.status(404).json({ success: false, message: 'Table pawa jayni.' });
    }

    // একই টেবিল থেকে একই type এর PENDING রিকোয়েস্ট ২০ সেকেন্ডের মধ্যে এলে ডুপ্লিকেট হ্যান্ডেল করা
    if (type !== 'OTHER') {
      const duplicate = await prisma.serviceRequest.findFirst({
        where: {
          tableId: table.id,
          type,
          status: 'PENDING',
          createdAt: { gte: new Date(Date.now() - COOLDOWN_MS) },
        },
      });

      if (duplicate) {
        return res.status(200).json({
          success: true,
          duplicate: true,
          message: 'Ei request already pathano hoyeche.',
          data: duplicate,
        });
      }
    }

    const request = await prisma.serviceRequest.create({
      data: {
        tableId: table.id,
        type,
        message: message || null,
      },
      include: { table: tableSelect },
    });

    // এডমিন প্যানেলে লাইভ নোটিফিকেশন পাঠানো (getIO() অথবা req.app.get('io'))
    const io = getIO() || req.app.get('io');
    if (io) {
      io.to('admin').emit('new_service_request', {
        id: request.id,
        type: request.type,
        message: request.message,
        status: request.status,
        createdAt: request.createdAt,
        tableId: request.table.id,
        tableNumber: request.table.tableNumber,
      });
    }

    return res.status(201).json({ success: true, data: request });
  } catch (error) {
    console.error('createServiceRequest error:', error);
    return res.status(500).json({ success: false, message: 'Request pathano shombhob hoyni.' });
  }
};

/* ------------------------------------------------------------------
 * GET /api/service-requests?status=PENDING|RESOLVED|ALL   (admin)
 * ------------------------------------------------------------------ */
exports.getServiceRequests = async (req, res) => {
  try {
    const status = String(req.query.status || 'PENDING').toUpperCase();

    let where = {};
    if (status !== 'ALL') {
      if (!ALLOWED_STATUS.includes(status)) {
        return res.status(400).json({ success: false, message: 'Invalid status.' });
      }
      where = { status };
    }

    const requests = await prisma.serviceRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { table: tableSelect },
    });

    return res.json({ success: true, data: requests });
  } catch (error) {
    console.error('getServiceRequests error:', error);
    return res.status(500).json({ success: false, message: 'Request list ane shomossha hoyeche.' });
  }
};

/* ------------------------------------------------------------------
 * PATCH /api/service-requests/:id/resolve   (admin / waiter)
 * ------------------------------------------------------------------ */
exports.resolveServiceRequest = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ success: false, message: 'Invalid id.' });
    }

    const existing = await prisma.serviceRequest.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Request pawa jayni.' });
    }
    if (existing.status === 'RESOLVED') {
      return res.json({ success: true, data: existing });
    }

    const updated = await prisma.serviceRequest.update({
      where: { id },
      data: { status: 'RESOLVED', resolvedAt: new Date() },
      include: { table: tableSelect },
    });

    const io = getIO() || req.app.get('io');
    if (io) {
      const payload = {
        id: updated.id,
        type: updated.type,
        status: updated.status,
        tableId: updated.table.id,
        tableNumber: updated.table.tableNumber,
      };
      io.to('admin').emit('service_request_updated', payload); // অন্য এডমিন স্ক্রিন sync রাখতে
      io.to(`table_${updated.table.tableNumber}`).emit('service_request_updated', payload); // ওই টেবিলের কাস্টমার
    }

    return res.json({ success: true, data: updated });
  } catch (error) {
    console.error('resolveServiceRequest error:', error);
    return res.status(500).json({ success: false, message: 'Request update korte shomossha hoyeche.' });
  }
};