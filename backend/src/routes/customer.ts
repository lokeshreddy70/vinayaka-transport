import { Router } from 'express';
import { customerController } from '../controllers/customerController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/profile', (req, res, next) => customerController.getProfile(req as any, res, next));
router.put('/profile', (req, res, next) => customerController.updateProfile(req as any, res, next));
router.post('/addresses', (req, res, next) => customerController.addAddress(req as any, res, next));
router.get('/addresses', (req, res, next) => customerController.getSavedAddresses(req as any, res, next));
router.get('/orders', (req, res, next) => customerController.getOrders(req as any, res, next));
router.get('/wallet', (req, res, next) => customerController.getWallet(req as any, res, next));

export default router;
