const prisma = require('../config/db');

// ✅ Socket e "menu_updated" pathanor helper (io na thakleo crash korbe na)
const emitMenuUpdate = (req, payload) => {
  try {
    const io = req.app.get('io');
    if (io) io.emit('menu_updated', payload);
  } catch (err) {
    console.error('Menu socket emit error:', err);
  }
};

// 1. Get Menu Items (Customer & Admin both)
exports.getMenu = async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      include: {
        menuItems: {
          orderBy: { id: 'desc' },
        },
      },
    });
    res.json(categories);
  } catch (error) {
    console.error('Fetch Menu Error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch menu' });
  }
};

// 2. Create New Menu Item
exports.createMenuItem = async (req, res) => {
  try {
    const { name, description, price, categoryName, imageUrl, isAvailable } = req.body;

    if (!name || price === undefined || price === '') {
      return res.status(400).json({ success: false, message: 'Name and Price are required' });
    }

    const catName = categoryName?.trim() || 'Main';

    // Check or create category
    let category = await prisma.category.findFirst({
      where: { name: catName },
    });

    if (!category) {
      category = await prisma.category.create({
        data: { name: catName },
      });
    }

    // Create Menu Item
    const newItem = await prisma.menuItem.create({
      data: {
        name,
        description: description || '',
        price: parseFloat(price),
        imageUrl: imageUrl || '',
        isAvailable: isAvailable ?? true,
        categoryId: category.id,
      },
      include: { category: true },
    });

    // ⚡ Live update
    emitMenuUpdate(req, {
      action: 'created',
      id: newItem.id,
      isAvailable: newItem.isAvailable,
    });

    res.status(201).json(newItem);
  } catch (error) {
    console.error('Create Menu Item Error:', error);
    res.status(500).json({ success: false, message: 'Failed to create menu item' });
  }
};

// 3. Update Menu Item
exports.updateMenuItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, categoryName, imageUrl, isAvailable } = req.body;

    let categoryId = undefined;
    if (categoryName) {
      let category = await prisma.category.findFirst({
        where: { name: categoryName },
      });
      if (!category) {
        category = await prisma.category.create({
          data: { name: categoryName },
        });
      }
      categoryId = category.id;
    }

    const updatedItem = await prisma.menuItem.update({
      where: { id: Number(id) },
      data: {
        name,
        description,
        price: price !== undefined ? parseFloat(price) : undefined,
        imageUrl,
        isAvailable,
        ...(categoryId && { categoryId }),
      },
      include: { category: true },
    });

    // ⚡ Live update
    emitMenuUpdate(req, {
      action: 'updated',
      id: updatedItem.id,
      isAvailable: updatedItem.isAvailable,
    });

    res.json(updatedItem);
  } catch (error) {
    console.error('Update Menu Item Error:', error);
    res.status(500).json({ success: false, message: 'Failed to update menu item' });
  }
};

// 4. Toggle Stock Availability
exports.toggleAvailability = async (req, res) => {
  try {
    const { id } = req.params;
    const { isAvailable } = req.body;

    const updatedItem = await prisma.menuItem.update({
      where: { id: Number(id) },
      data: { isAvailable: Boolean(isAvailable) },
    });

    // ⚡ Live update
    emitMenuUpdate(req, {
      action: 'toggled',
      id: updatedItem.id,
      isAvailable: updatedItem.isAvailable,
    });

    res.json(updatedItem);
  } catch (error) {
    console.error('Toggle Availability Error:', error);
    res.status(500).json({ success: false, message: 'Failed to toggle availability' });
  }
};

// 5. Delete Menu Item
exports.deleteMenuItem = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.menuItem.delete({
      where: { id: Number(id) },
    });

    // ⚡ Live update (delete hole item unavailable er moto kaj korbe)
    emitMenuUpdate(req, {
      action: 'deleted',
      id: Number(id),
      isAvailable: false,
    });

    res.json({ success: true, message: 'Menu item deleted successfully' });
  } catch (error) {
    console.error('Delete Menu Item Error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete menu item' });
  }
};