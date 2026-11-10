const prisma = require('../config/db');
const { getIO } = require('../config/socket');
const crypto = require('crypto');

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

    // Check whether table already exists
    const existingTable = await prisma.table.findUnique({
      where: {
        tableNumber: String(tableNumber)
      }
    });

    if (existingTable) {
      return res.status(409).json({
        message: 'This table is already created.'
      });
    }

    // Create new table
    const newTable = await prisma.table.create({
      data: {
        tableNumber: String(tableNumber),
        capacity: Number(capacity)
      }
    });

    res.status(201).json(newTable);

  } catch (error) {
    res.status(500).json({
      message: 'Failed to create table.'
    });
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
    const clientToken = req.headers['x-table-token']; 

    let table = await prisma.table.findUnique({
      where: { tableNumber: String(tableNumber) },
    });

    if (!table) {
      return res.status(404).json({ success: false, message: 'Table not found' });
    }

    // যদি টেবিল ইতিমধ্যেই বুকড থাকে
    if (table.isOccupied) {
      if (clientToken && table.sessionToken === clientToken) {
        return res.status(200).json({ 
          success: true, 
          table, 
          token: clientToken, 
          message: 'Session restored' 
        });
      }

      return res.status(403).json({
        success: false,
        message: 'এই টেবিলটি বর্তমানে অন্য কাস্টমার ব্যবহার করছেন!',
      });
    }

    const newToken = crypto.randomUUID();

    const updatedTable = await prisma.table.update({
      where: { id: table.id },
      data: {
        isOccupied: true,
        currentCustomerName: name,
        currentCustomerPhone: phone,
        sessionToken: newToken,
      },
    });

    const io = getIO();
    if (io) {
      // ১. এডমিনকে রিয়েল-টাইমে টেবিল স্ট্যাটাস লাল/বুকড দেখানো
      io.to('admin').emit('table_updated', updatedTable);

      // ২. কাস্টমার রুমেও আপডেট ইভেন্ট পাঠানো (লাইভ সিঙ্ক এর জন্য)
      io.to(`table_${updatedTable.tableNumber}`).emit('table_occupied', updatedTable);
      io.to(`table_${updatedTable.id}`).emit('table_occupied', updatedTable);
    }

    return res.status(200).json({ 
      success: true, 
      table: updatedTable, 
      token: newToken 
    });

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

    // Table update with sessionToken null
    const updatedTable = await prisma.table.update({
      where: { id: Number(id) },
      data: {
        isOccupied: false,
        currentCustomerName: null,
        currentCustomerPhone: null,
        sessionToken: null, // 👈 সেশন টোকেন ডিলিট করা হলো
      },
    });

    const io = getIO();
    if (io) {
      // 1. Admin dashboard update
      io.to('admin').emit('table_updated', updatedTable);

      // 2. Customer side auto logout socket events
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

// controllers/tableController.js
exports.verifySession = async (req, res) => {
  try {
    const { tableId } = req.params;
    const clientToken = req.headers['x-table-token'];

    // টেবিল তথ্য খোঁজা (tableNumber বা id দিয়ে)
    const table = await prisma.table.findFirst({
      where: {
        OR: [
          { id: isNaN(tableId) ? undefined : Number(tableId) },
          { tableNumber: String(tableId) }
        ]
      }
    });

    // টেবিল না থাকলে, বুকড না থাকলে বা টোকেন না মিললে invalid
    if (!table || !table.isOccupied || table.sessionToken !== clientToken) {
      return res.status(401).json({ success: false, isValid: false, message: 'Invalid Session' });
    }

    // সেশন সঠিক থাকলে
    return res.status(200).json({ success: true, isValid: true, table });
  } catch (error) {
    console.error('Verify Session Error:', error);
    return res.status(500).json({ success: false, isValid: false });
  }
};