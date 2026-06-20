import { Router } from 'express';
import { riderController } from '../controllers/riderController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/register', authenticate, (req, res, next) => riderController.registerRider(req as any, res, next));
router.get('/profile', authenticate, (req, res, next) => riderController.getRiderProfile(req as any, res, next));
router.post('/location', authenticate, (req, res, next) => riderController.updateLocation(req as any, res, next));
router.post('/online', authenticate, (req, res, next) => riderController.goOnline(req as any, res, next));
router.post('/offline', authenticate, (req, res, next) => riderController.goOffline(req as any, res, next));

export default router;
