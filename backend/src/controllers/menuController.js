const prisma = require('../config/db');

// Get full menu with categories
exports.getMenu = async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      include: {
        menuItems: {
          where: { isAvailable: true },
        },
      },
    });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch menu' });
  }
};

// Create Category
exports.createCategory = async (req, res) => {
  try {
    const { name } = req.body;
    const category = await prisma.category.create({ data: { name } });
    res.status(201).json(category);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create category' });
  }
};

// Create Menu Item
exports.createMenuItem = async (req, res) => {
  try {
    const { categoryId, name, description, price, imageUrl } = req.body;
    const menuItem = await prisma.menuItem.create({
      data: { categoryId: Number(categoryId), name, description, price, imageUrl },
    });
    res.status(201).json(menuItem);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add menu item' });
  }
};