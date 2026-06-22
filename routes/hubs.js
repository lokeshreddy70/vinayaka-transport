const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const { listHubs, createHub, updateHub, setHubRoute } = require('../controllers/hubController');

router.get('/', listHubs); // public — customer app needs this to show pickup/drop options
router.post('/', verifyToken, requireRole('admin'), createHub);
router.patch('/:id', verifyToken, requireRole('admin'), updateHub); // <-- admin sets delivery range here
router.post('/routes', verifyToken, requireRole('admin'), setHubRoute);

module.exports = router;
