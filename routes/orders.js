const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const {
  getQuote, createOrder, updateOrderStatus, listMyOrders, listAllOrders,
} = require('../controllers/orderController');

router.post('/quote', verifyToken, getQuote);
router.post('/', verifyToken, requireRole('customer'), createOrder);
router.patch('/:id/status', verifyToken, requireRole('driver', 'admin'), updateOrderStatus);
router.get('/mine', verifyToken, requireRole('customer'), listMyOrders);
router.get('/', verifyToken, requireRole('admin'), listAllOrders);

module.exports = router;
