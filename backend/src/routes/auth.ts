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

export default router;
