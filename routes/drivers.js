const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const { registerVehicle, approveDriver, updateStatus, listDrivers } = require('../controllers/driverController');

router.post('/register', verifyToken, requireRole('driver'), registerVehicle);
router.patch('/status', verifyToken, requireRole('driver'), updateStatus);
router.patch('/:id/approve', verifyToken, requireRole('admin'), approveDriver);
router.get('/', verifyToken, requireRole('admin'), listDrivers);

module.exports = router;
