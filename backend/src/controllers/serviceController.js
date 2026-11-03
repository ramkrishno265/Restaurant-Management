const prisma = require('../config/db');
const { getIO } = require('../config/socket');

exports.createServiceRequest = async (req, res) => {
  try {
    const { tableId, type } = req.body;

    const request = await prisma.serviceRequest.create({
      data: { tableId: Number(tableId), type },
      include: { table: true },
    });

    const io = getIO();
    io.to('admin').emit('new_service_request', request);

    res.status(201).json({ success: true, request });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create service request' });
  }
};