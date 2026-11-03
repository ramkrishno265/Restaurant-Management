const prisma = require('../config/db');

exports.createTable = async (req, res) => {
  try {
    const { tableNumber } = req.body;
    const table = await prisma.table.create({ data: { tableNumber } });
    res.status(201).json(table);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create table' });
  }
};

exports.getTables = async (req, res) => {
  try {
    const tables = await prisma.table.findMany();
    res.json(tables);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tables' });
  }
};