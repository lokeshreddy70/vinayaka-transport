import { Router } from 'express';
import { authController } from '../controllers/authController';
import { authenticate } from '../middleware/auth';
import { otpLimiter, authLimiter } from '../middleware/rateLimiter';

const router = Router();

// OTP endpoints
router.post('/send-otp', otpLimiter, (req, res, next) => authController.sendOTP(req, res, next));
router.post('/verify-otp', authLimiter, (req, res, next) => authController.verifyOTPAndRegister(req, res, next));
router.post('/login', authLimiter, (req, res, next) => authController.login(req, res, next));
router.post('/login-password', authLimiter, (req, res, next) => authController.loginWithPassword(req, res, next));
router.get('/me', authenticate, (req, res, next) => authController.me(req as any, res, next));
router.post('/set-password', authenticate, (req, res, next) => authController.setPassword(req as any, res, next));
router.post('/logout', authenticate, (req, res, next) => authController.logout(req as any, res, next));
router.post('/refresh-token', (req, res, next) => authController.refreshToken(req as any, res, next));
router.post('/refresh', (req, res, next) => authController.refreshToken(req as any, res, next));

// Customer app compatibility endpoints
router.post('/customer-request-otp', otpLimiter, (req, res, next) => {
	req.body.phoneNumber = req.body.phoneNumber || req.body.phone;
	return authController.sendOTP(req, res, next);
});

router.post('/customer-verify-otp', authLimiter, (req, res, next) => {
	req.body.phoneNumber = req.body.phoneNumber || req.body.phone;
	req.body.otp = req.body.otp || req.body.token;
	req.body.deviceId = req.body.deviceId || req.body.device_id || 'web-customer-device';
	req.body.deviceInfo = req.body.deviceInfo || req.body.device_info || 'Customer Web App';
	return authController.login(req, res, next);
});

router.post('/customer-password-login', authLimiter, (req, res, next) => {
	req.body.phoneNumber = req.body.phoneNumber || req.body.phone;
	req.body.deviceId = req.body.deviceId || req.body.device_id || 'web-customer-device';
	req.body.deviceInfo = req.body.deviceInfo || req.body.device_info || 'Customer Web App';
	req.body.role = req.body.role || 'CUSTOMER';
	return authController.loginWithPassword(req, res, next);
});

router.post('/customer-register', authLimiter, (req, res, next) => authController.registerCustomer(req, res, next));

export default router;
