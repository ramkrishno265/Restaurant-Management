const prisma = require('../config/db');
const { getIO } = require('../config/socket');

// ১. Place / Create Order (কাস্টমার প্যানেল থেকে আসবে)
exports.createOrder = async (req, res) => {
  try {
    const { tableId, customerName, customerPhone, items, specialRequest, totalAmount } = req.body;

    if (!tableId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Invalid or empty order request' });
    }

    // টেবিল নম্বর ও আইডি দুটিভাবেই সার্চ করা
    const parsedId = parseInt(tableId, 10);
    let targetTable = null;

    if (!isNaN(parsedId)) {
      targetTable = await prisma.table.findUnique({
        where: { id: parsedId },
      });
    }

    if (!targetTable) {
      targetTable = await prisma.table.findFirst({
        where: { tableNumber: String(tableId) },
      });
    }

    // টেবিল ডাটাবেজে না পাওয়া গেলে অটোমেটিক ক্রিয়েট করা
    if (!targetTable) {
      targetTable = await prisma.table.create({
        data: {
          tableNumber: String(tableId),
          status: 'OCCUPIED',
        },
      });
    }

    // নতুন অর্ডার তৈরি করা
    const newOrder = await prisma.order.create({
      data: {
        tableId: targetTable.id,
        customerName: customerName || 'Guest',
        customerPhone: customerPhone || 'N/A',
        specialRequest: specialRequest || null,
        totalAmount: Number(totalAmount),
        orderItems: {
          create: items.map((item) => ({
            menuItemId: Number(item.menuItemId || item.id),
            quantity: Number(item.quantity),
            unitPrice: Number(item.unitPrice || item.price),
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

    return res.status(201).json(newOrder);
  } catch (error) {
    console.error('Error placing order:', error);
    return res.status(500).json({ error: 'Failed to place order', details: error.message });
  }
};

// alias support
exports.placeOrder = exports.createOrder;

// ২. Update / Append Items to Existing Active Order (চলতি অর্ডারে নতুন খাবার যোগ করলে)
exports.updateOrderItems = async (req, res) => {
  try {
    const { id } = req.params;
    const { items, totalAmount } = req.body;

    const existingOrder = await prisma.order.findUnique({
      where: { id: Number(id) },
    });

    if (!existingOrder) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (existingOrder.status !== 'PENDING') {
      return res.status(400).json({ error: 'Order is already processing, cannot modify!' });
    }

    // আগের পুরোনো আইটেমগুলো মুছে নতুন কনসোলিডেটেড লিস্ট রিপ্লেস করা
    await prisma.orderItem.deleteMany({
      where: { orderId: Number(id) },
    });

    const updatedOrder = await prisma.order.update({
      where: { id: Number(id) },
      data: {
        totalAmount: Number(totalAmount),
        orderItems: {
          create: items.map((item) => ({
            menuItemId: Number(item.menuItemId || item.id),
            quantity: Number(item.quantity),
            unitPrice: Number(item.unitPrice || item.price),
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
      io.to('kitchen').to('admin').emit('new_order', updatedOrder);
    }

    return res.json(updatedOrder);
  } catch (error) {
    console.error('Error updating order items:', error);
    return res.status(500).json({ error: 'Failed to update order items' });
  }
};

// ৩. Get Active Orders (অ্যাডমিন ও কিচেন ড্যাশবোর্ডের জন্য)
exports.getActiveOrders = async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      where: { status: { notIn: ['SERVED', 'CANCELLED'] } },
      include: {
        table: true,
        orderItems: { include: { menuItem: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return res.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    return res.status(500).json({ error: 'Failed to fetch orders' });
  }
};

// alias support
exports.getOrders = exports.getActiveOrders;

// ৪. Update Order Status (অর্ডার স্ট্যাটাস পরিবর্তনের জন্য)
exports.updateOrderStatus = async (req, res) => {
  try {
    const { id, orderId } = req.params;
    const targetId = id || orderId;
    const { status } = req.body;

    if (!targetId || !status) {
      return res.status(400).json({ error: 'Order ID and status are required' });
    }

    const updatedOrder = await prisma.order.update({
      where: { id: Number(targetId) },
      data: { status },
      include: {
        table: true,
        orderItems: { include: { menuItem: true } },
      },
    });

    // Socket Emit to Kitchen, Admin and Specific Customer Table
    const io = getIO();
    if (io) {
      io.to('kitchen')
        .to('admin')
        .to(`table_${updatedOrder.table?.tableNumber || updatedOrder.tableId}`)
        .emit('order_status_updated', updatedOrder);
    }

    return res.json({ success: true, order: updatedOrder });
  } catch (error) {
    console.error('Error updating order status:', error);
    return res.status(500).json({ error: 'Failed to update order status' });
  }
};

// ৫. Cancel Full Order (কাস্টমার বা অ্যাডমিন সম্পূর্ণ অর্ডার বাতিল করলে)
exports.cancelOrder = async (req, res) => {
  try {
    const { id } = req.params;

    const updatedOrder = await prisma.order.update({
      where: { id: Number(id) },
      data: { status: 'CANCELLED' },
      include: { table: true },
    });

    const io = getIO();
    if (io) {
      io.to('kitchen').to('admin').emit('order_status_updated', updatedOrder);
    }

    return res.json({ success: true, message: 'Order cancelled successfully' });
  } catch (error) {
    console.error('Error cancelling order:', error);
    return res.status(500).json({ error: 'Failed to cancel order' });
  }
};