const prisma = require('../config/db');
const { getIO } = require('../config/socket');

// ১. Place / Create Order (কাস্টমার প্যানেল থেকে আসবে)
exports.createOrder = async (req, res) => {
  try {
    const { tableId, customerName, customerPhone, items, specialRequest, totalAmount } = req.body;

    const newOrder = await prisma.order.create({
      data: {
        tableId: Number(tableId),
        customerName: customerName || 'Guest',
        customerPhone: customerPhone || 'N/A',
        specialRequest: specialRequest || null,
        totalAmount: Number(totalAmount),
        orderItems: {
          create: items.map((item) => ({
            menuItemId: Number(item.menuItemId),
            quantity: Number(item.quantity),
            unitPrice: Number(item.unitPrice),
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
    if (io) {
      io.to('kitchen').to('admin').emit('new_order', newOrder);
    }

    res.status(201).json({ success: true, order: newOrder });
  } catch (error) {
    console.error('Error placing order:', error);
    res.status(500).json({ error: 'Failed to place order' });
  }
};

// alias support (যদি আগের জায়গায় placeOrder ব্যবহৃত হয়ে থাকে)
exports.placeOrder = exports.createOrder;

// ২. Get Active Orders (অ্যাডমিন ও কিচেন ড্যাশবোর্ডের জন্য)
exports.getActiveOrders = async (req, res) => {
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
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
};

// alias support (যদি আগের জায়গায় getOrders ব্যবহৃত হয়ে থাকে)
exports.getOrders = exports.getActiveOrders;

// ৩. Update Order Status (অর্ডার স্ট্যাটাস পরিবর্তনের জন্য)
exports.updateOrderStatus = async (req, res) => {
  try {
    const { id, orderId } = req.params;
    const targetId = id || orderId; // params parameter handling
    const { status } = req.body;

    const updatedOrder = await prisma.order.update({
      where: { id: Number(targetId) },
      data: { status },
      include: {
        table: true,
        orderItems: { include: { menuItem: true } },
      },
    });

    // Socket Emit
    const io = getIO();
    if (io) {
      io.to('kitchen')
        .to('admin')
        .to(`table_${updatedOrder.tableId}`)
        .emit('order_status_updated', updatedOrder);
    }

    res.json({ success: true, order: updatedOrder });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ error: 'Failed to update order status' });
  }
};