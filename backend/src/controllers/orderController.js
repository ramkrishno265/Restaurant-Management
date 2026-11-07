const prisma = require('../config/db');
const { getIO } = require('../config/socket');

// ১. Place / Create Order (Multiple Sub-Orders Support)
exports.createOrder = async (req, res) => {
  try {
    const { tableId, customerName, customerPhone, items, specialRequest, totalAmount } = req.body;

    if (!tableId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Invalid or empty order request' });
    }

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

    if (!targetTable) {
      targetTable = await prisma.table.create({
        data: {
          tableNumber: String(tableId),
          isOccupied: true,
        },
      });
    } else if (!targetTable.isOccupied) {
      await prisma.table.update({
        where: { id: targetTable.id },
        data: { isOccupied: true },
      });
    }

    // ⚡ চেক করুন এই টেবিলে বর্তমানে কোনো PENDING অর্ডার আছে কি না
    const existingPendingOrder = await prisma.order.findFirst({
      where: {
        tableId: targetTable.id,
        status: 'PENDING',
      },
    });

    // PENDING অর্ডার থাকলে আগের অর্ডারে যোগ হবে, কিন্তু COOKING/READY থাকলে নতুন Sub-Order ক্রিয়েট হবে
    if (existingPendingOrder) {
      return exports.updateOrderItems(
        { params: { id: existingPendingOrder.id }, body: { items, totalAmount } },
        res
      );
    }

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

    const io = getIO();
    if (io) {
      io.to('kitchen')
        .to('admin')
        .to(`table_${targetTable.tableNumber}`)
        .to(`table_${targetTable.id}`)
        .emit('new_order', newOrder);
    }

    return res.status(201).json(newOrder);
  } catch (error) {
    console.error('Error placing order:', error);
    return res.status(500).json({ error: 'Failed to place order', details: error.message });
  }
};

exports.placeOrder = exports.createOrder;

// ২. Update / Append Items to Existing Active Order
exports.updateOrderItems = async (req, res) => {
  try {
    const { id } = req.params;
    const { items, totalAmount } = req.body;

    const existingOrder = await prisma.order.findUnique({
      where: { id: Number(id) },
      include: { table: true },
    });

    if (!existingOrder) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (existingOrder.status !== 'PENDING') {
      return res.status(400).json({ error: 'Order is already processing, cannot modify!' });
    }

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

    const io = getIO();
    if (io) {
      const tNum = updatedOrder.table?.tableNumber || existingOrder.table?.tableNumber;
      io.to('kitchen')
        .to('admin')
        .to(`table_${tNum}`)
        .to(`table_${updatedOrder.tableId}`)
        .emit('new_order', updatedOrder);
    }

    return res.json(updatedOrder);
  } catch (error) {
    console.error('Error updating order items:', error);
    return res.status(500).json({ error: 'Failed to update order items' });
  }
};

// ৩. Get Active Orders for Specific Table (⚡ একাধিক সক্রিয় অর্ডার Array রেসপন্স)
exports.getActiveCustomerOrder = async (req, res) => {
  try {
    const { tableId } = req.params;
    const parsedId = parseInt(tableId, 10);

    let targetTable = null;
    if (!isNaN(parsedId)) {
      targetTable = await prisma.table.findUnique({ where: { id: parsedId } });
    }
    if (!targetTable) {
      targetTable = await prisma.table.findFirst({ where: { tableNumber: String(tableId) } });
    }

    if (!targetTable) {
      return res.json([]);
    }

    // findFirst-এর বদলে findMany দিয়ে একটি টেবিলের সকল রানিং অর্ডার ফেচ করা
    const activeOrders = await prisma.order.findMany({
      where: {
        tableId: targetTable.id,
        status: { notIn: ['SERVED', 'CANCELLED'] },
      },
      include: {
        table: true,
        orderItems: { include: { menuItem: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formattedOrders = activeOrders.map((order) => ({
      id: order.id,
      status: order.status,
      totalAmount: Number(order.totalAmount),
      estimatedMinutes: order.estimatedMinutes,
      cookingStartedAt: order.cookingStartedAt,
      items: order.orderItems.map((item) => ({
        id: item.id,
        menuItemId: item.menuItemId,
        name: item.menuItem.name,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        price: Number(item.unitPrice),
      })),
    }));

    return res.json(formattedOrders);
  } catch (error) {
    console.error('Error fetching active customer orders:', error);
    return res.status(500).json({ error: 'Failed to fetch active orders' });
  }
};

// ৪. Get All Active Orders
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

exports.getOrders = exports.getActiveOrders;

// ৫. Update Order Status (Safe Table Number Fetching)
exports.updateOrderStatus = async (req, res) => {
  try {
    const { id, orderId } = req.params;
    const targetId = id || orderId;
    const { status, estimatedMinutes } = req.body;

    let updateData = { status };

    if (status === 'COOKING') {
      updateData.cookingStartedAt = new Date();
      if (estimatedMinutes) {
        updateData.estimatedMinutes = Number(estimatedMinutes);
      }
    }

    const updatedOrder = await prisma.order.update({
      where: { id: Number(targetId) },
      data: updateData,
      include: {
        table: true,
        orderItems: { include: { menuItem: true } },
      },
    });

    const io = getIO();
    if (io) {
      const tableNumber = updatedOrder.table?.tableNumber || String(updatedOrder.tableId);

      const payload = {
        tableId: updatedOrder.tableId,
        tableNumber: tableNumber,
        orderId: updatedOrder.id,
        status: updatedOrder.status,
        estimatedMinutes: updatedOrder.estimatedMinutes,
        cookingStartedAt: updatedOrder.cookingStartedAt,
      };

      console.log(`📡 Emitting Order Update to table_${tableNumber} & table_${updatedOrder.tableId}:`, payload);

      io.to('kitchen')
        .to('admin')
        .to(`table_${tableNumber}`)
        .to(`table_${updatedOrder.tableId}`)
        .emit('order_status_updated', payload);
    }

    return res.json({ success: true, order: updatedOrder });
  } catch (error) {
    console.error('Error updating order status:', error);
    return res.status(500).json({ error: 'Failed to update order status' });
  }
};

// ৬. Cancel Full Order
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
      const tableNumber = updatedOrder.table?.tableNumber || String(updatedOrder.tableId);

      const payload = {
        tableId: updatedOrder.tableId,
        tableNumber: tableNumber,
        orderId: updatedOrder.id,
        status: 'CANCELLED',
      };

      io.to('kitchen')
        .to('admin')
        .to(`table_${tableNumber}`)
        .to(`table_${updatedOrder.tableId}`)
        .emit('order_status_updated', payload);
    }

    return res.json({ success: true, message: 'Order cancelled successfully' });
  } catch (error) {
    console.error('Error cancelling order:', error);
    return res.status(500).json({ error: 'Failed to cancel order' });
  }
};