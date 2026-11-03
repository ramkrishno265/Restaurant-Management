const express = require('express');
const router = express.Router();
const menuController = require('../controllers/menuController');

router.get('/', menuController.getMenu);
router.post('/categories', menuController.createCategory);
router.post('/items', menuController.createMenuItem);

module.exports = router;