const prisma = require('../config/db');
const { getIO } = require('../config/socket');

// Place Order
exports.placeOrder = async (req, res) => {
  try {
    const { tableId, items, specialRequest, totalAmount } = req.body;

    const newOrder = await prisma.order.create({
      data: {
        tableId: Number(tableId),
        specialRequest,
        totalAmount,
        orderItems: {
          create: items.map((item) => ({
            menuItemId: Number(item.menuItemId),
            quantity: Number(item.quantity),
            unitPrice: item.unitPrice,
          })),
        },
      },
      include: {
        table: true,
        orderItems: { include: { menuItem: true } },
      },
    });

    // Socket Emit to Admin & Kitchen
    const io = getIO();
    io.to('kitchen').to('admin').emit('new_order', newOrder);

    res.status(201).json({ success: true, order: newOrder });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to place order' });
  }
};

// Get Active Orders
exports.getOrders = async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      where: { status: { notIn: ['SERVED', 'CANCELLED'] } },
      include: {
        table: true,
        orderItems: { include: { menuItem: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
};

// Update Order Status
exports.updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const updatedOrder = await prisma.order.update({
      where: { id: Number(id) },
      data: { status },
      include: { table: true },
    });

    // Socket Emit
    const io = getIO();
    io.to('kitchen')
      .to('admin')
      .to(`table_${updatedOrder.tableId}`)
      .emit('order_status_updated', updatedOrder);

    res.json({ success: true, order: updatedOrder });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update order status' });
  }
};