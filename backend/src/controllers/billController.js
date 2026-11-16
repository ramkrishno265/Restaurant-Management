const prisma = require('../config/db');
const { getIO } = require('../config/socket');

const round2 = (n) => Math.round(n * 100) / 100;

const EMPTY_BILL = {
  orders: [],
  orderCount: 0,
  total: 0,
  paidAmount: 0,
  dueAmount: 0,
  isPaid: false,
};

// ---------- Helper: টেবিল খোঁজা ----------
// Customer URL-এ tableNumber আসে, তাই আগে id, না পেলে tableNumber দিয়ে খুঁজি
const findTableByIdOrNumber = async (value) => {
  const parsedId = parseInt(value, 10);
  let table = null;

  if (!isNaN(parsedId)) {
    table = await prisma.table.findUnique({ where: { id: parsedId } });
  }
  if (!table) {
    table = await prisma.table.findFirst({ where: { tableNumber: String(value) } });
  }
  return table;
};

// ---------- Helper: টেবিলের বর্তমান বিল বের করা ----------
const calculateBill = async (table) => {
  // টেবিল ফাঁকা বা নেই হলে বিল ০
  if (!table || !table.isOccupied) return EMPTY_BILL;

  const orders = await prisma.order.findMany({
    where: {
      tableId: table.id,
      isClosed: false,               // ক্লিয়ার হয়ে যাওয়া পুরনো অর্ডার বাদ
      status: { not: 'CANCELLED' },  // ক্যানসেল বাদ
    },
    include: { orderItems: { include: { menuItem: true } } },
    orderBy: { createdAt: 'asc' },
  });

  const formatted = orders.map((order) => {
    const items = order.orderItems.map((item) => ({
      id: item.id,
      menuItemId: item.menuItemId,
      name: item.menuItem?.name || 'Item',
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
      price: Number(item.unitPrice),
    }));

    const subtotal = round2(items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0));

    return {
      id: order.id,
      status: order.status,
      isPaid: order.isPaid,
      items,
      subtotal,
    };
  });

  const total = round2(formatted.reduce((sum, o) => sum + o.subtotal, 0));
  const paidAmount = round2(
    formatted.filter((o) => o.isPaid).reduce((sum, o) => sum + o.subtotal, 0)
  );
  const dueAmount = round2(total - paidAmount);

  return {
    orders: formatted,
    orderCount: formatted.length,
    total,
    paidAmount,
    dueAmount,
    isPaid: formatted.length > 0 && dueAmount === 0,
  };
};

// ১. GET /tables/:id/bill  → Admin (table.id দিয়ে)
exports.getAdminTableBill = async (req, res) => {
  try {
    const table = await prisma.table.findUnique({ where: { id: Number(req.params.id) } });
    if (!table) return res.status(404).json({ error: 'Table not found' });

    const bill = await calculateBill(table);
    return res.json(bill);
  } catch (error) {
    console.error('Admin bill error:', error);
    return res.status(500).json({ error: 'Failed to fetch bill' });
  }
};

// ২. GET /orders/bill/:tableId  → Customer (tableNumber বা id দিয়ে)
exports.getCustomerBill = async (req, res) => {
  try {
    const table = await findTableByIdOrNumber(req.params.tableId);
    const bill = await calculateBill(table);
    return res.json(bill);
  } catch (error) {
    console.error('Customer bill error:', error);
    return res.status(500).json({ error: 'Failed to fetch bill' });
  }
};

// ৩. PATCH /tables/:id/pay  → Admin পেমেন্ট নিশ্চিত করবে   body: { method }
exports.payTableBill = async (req, res) => {
  try {
    const { method } = req.body;

    if (!['CASH', 'BKASH', 'CARD'].includes(method)) {
      return res.status(400).json({ message: 'Invalid payment method' });
    }

    const table = await prisma.table.findUnique({ where: { id: Number(req.params.id) } });
    if (!table || !table.isOccupied) {
      return res.status(400).json({ message: 'Ei table e kono customer nei' });
    }

    const result = await prisma.order.updateMany({
      where: {
        tableId: table.id,
        isClosed: false,
        status: { not: 'CANCELLED' },
        isPaid: false,
      },
      data: {
        isPaid: true,
        paymentMethod: method,
        paidAt: new Date(),
      },
    });

    if (result.count === 0) {
      return res.status(400).json({ message: 'Kono unpaid order nei' });
    }

    // Admin ও Customer দুজনের স্ক্রিনই লাইভ আপডেট হবে
    const io = getIO();
    if (io) {
      io.to('admin')
        .to(`table_${table.tableNumber}`)
        .to(`table_${table.id}`)
        .emit('table_updated', {
          id: table.id,
          tableNumber: table.tableNumber,
          isOccupied: true,
        });
    }

    return res.json({ success: true, paidOrders: result.count });
  } catch (error) {
    console.error('Pay table error:', error);
    return res.status(500).json({ message: 'Payment failed' });
  }
};

exports.calculateBill = calculateBill;