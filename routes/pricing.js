const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const { listPricing, updatePricing } = require('../controllers/pricingController');

router.get('/', listPricing); // public — needed for upfront price display
router.patch('/:vehicle_type', verifyToken, requireRole('admin'), updatePricing);

module.exports = router;
