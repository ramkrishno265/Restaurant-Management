const express = require('express');
const router = express.Router();
const {
  createServiceRequest,
  getServiceRequests,
  resolveServiceRequest,
} = require('../controllers/serviceController');

// ১. কাস্টমার ফ্লোটিং বাটন থেকে সার্ভিস রিকোয়েস্ট পাঠাবে
router.post('/', createServiceRequest);

// ২. এডমিন প্যানেল থেকে সব রিকোয়েস্ট দেখা (PENDING / RESOLVED)
router.get('/', getServiceRequests);

// ৩. এডমিন/ওয়েটার রিকোয়েস্ট রেজলভ বা কমপ্লিট করবে
router.patch('/:id/resolve', resolveServiceRequest);

module.exports = router;