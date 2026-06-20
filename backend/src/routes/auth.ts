import { Router } from 'express';
import { authController } from '../controllers/authController';
import { otpLimiter, authLimiter } from '../middleware/rateLimiter';

const router = Router();

// OTP endpoints
router.post('/send-otp', otpLimiter, (req, res, next) => authController.sendOTP(req, res, next));
router.post('/verify-otp', authLimiter, (req, res, next) => authController.verifyOTPAndRegister(req, res, next));
router.post('/login', authLimiter, (req, res, next) => authController.login(req, res, next));
router.post('/logout', (req, res, next) => authController.logout(req as any, res, next));
router.post('/refresh-token', (req, res, next) => authController.refreshToken(req as any, res, next));

export default router;
