const express = require('express');
const router = express.Router();
const { 
  getTables, 
  createTable, 
  deleteTable, 
  occupyTable, 
  clearTable,
  verifySession // 👈 ১. নতুন ফাংশনটি Import করুন
} = require('../controllers/tableController');

// ১. অ্যাডমিন প্যানেলের রাউটসমূহ (Get, Create, Delete)
router.get('/', getTables);
router.post('/', createTable);
router.delete('/:id', deleteTable);

// ২. কাস্টমার ও টেবিল ম্যানেজমেন্ট রাউটসমূহ (Occupy, Verify & Clear)
router.post('/:tableNumber/occupy', occupyTable);

// 👈 ২. এই ভ্যালিডেশন রাউটটি যুক্ত করা হলো (যা পেজ রিফ্রেশের সময় চেক করবে)
router.get('/:tableId/verify', verifySession); 

router.patch('/:id/clear', clearTable);

module.exports = router;