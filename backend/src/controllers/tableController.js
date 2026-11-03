const prisma = require('../config/db');
const { getIO } = require('../config/socket');

// 1. Get all tables
exports.getTables = async (req, res) => {
  try {
    const tables = await prisma.table.findMany({ orderBy: { id: 'asc' } });
    res.json(tables);
  } catch (error) {
    console.error('Error fetching tables:', error);
    res.status(500).json({ error: 'Failed to fetch tables' });
  }
};

// 2. Create new table
exports.createTable = async (req, res) => {
  try {
    const { tableNumber, capacity } = req.body;
    const newTable = await prisma.table.create({
      data: { 
        tableNumber: String(tableNumber), 
        capacity: Number(capacity) || 4 
      }
    });
    res.status(201).json(newTable);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create table' });
  }
};

// 3. Delete table
exports.deleteTable = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.table.delete({ where: { id: Number(id) } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete table' });
  }
};

// 4. Occupy Table (Customer)
exports.occupyTable = async (req, res) => {
  try {
    const { tableNumber } = req.params;
    const { name, phone } = req.body;

    let table = await prisma.table.findUnique({
      where: { tableNumber: String(tableNumber) },
    });

    if (!table) {
      return res.status(404).json({ success: false, message: 'Table not found' });
    }

    if (table.isOccupied && table.currentCustomerPhone !== phone) {
      return res.status(403).json({
        success: false,
        message: 'এই টেবিলটি বর্তমানে অন্য কাস্টমার ব্যবহার করছেন!',
      });
    }

    const updatedTable = await prisma.table.update({
      where: { id: table.id },
      data: {
        isOccupied: true,
        currentCustomerName: name,
        currentCustomerPhone: phone,
      },
    });

    const io = getIO();
    if (io) io.to('admin').emit('table_updated', updatedTable);

    return res.status(200).json({ success: true, table: updatedTable });
  } catch (error) {
    console.error('Occupy Table Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to occupy table' });
  }
};

// 5. Clear Table & Logout Customer (Admin)
// 5. Clear Table & Logout Customer (Admin)
// Clear Table Handler (Admin)
exports.clearTable = async (req, res) => {
  try {
    const { id } = req.params;

    // Table update
    const updatedTable = await prisma.table.update({
      where: { id: Number(id) },
      data: {
        isOccupied: false,
        currentCustomerName: null,
        currentCustomerPhone: null,
      },
    });

    const io = getIO();
    if (io) {
      // 1. Admin dashboard update
      io.to('admin').emit('table_updated', updatedTable);

      // 2. Customer side auto logout socket events (multiple fallback format)
      io.to(`table_${updatedTable.tableNumber}`).emit('table_cleared');
      io.to(`table_${updatedTable.id}`).emit('table_cleared');
      io.to(`table_${id}`).emit('table_cleared');
    }

    return res.status(200).json({ success: true, table: updatedTable });
  } catch (error) {
    console.error('Clear Table Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to clear table' });
  }
};