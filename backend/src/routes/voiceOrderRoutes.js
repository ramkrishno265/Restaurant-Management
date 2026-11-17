const express = require('express');
const multer = require('multer');
const { handleVoiceOrder } = require('../controllers/voiceOrderController');

const router = express.Router();

// multer কনফিগারেশন (uploads ফোল্ডারে ফাইল সাময়িকভাবে জমা হবে)
const upload = multer({ dest: 'uploads/' });

// POST রুট
router.post('/voice-order', upload.single('audio'), handleVoiceOrder);

module.exports = router;