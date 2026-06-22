import { Router } from 'express';
import { riderController } from '../controllers/riderController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, authorize('ADMIN', 'FRANCHISE_MANAGER'), (req, res, next) =>
	riderController.listRiders(req as any, res, next)
);
router.get('/:riderId/details', authenticate, authorize('ADMIN', 'FRANCHISE_MANAGER'), (req, res, next) =>
	riderController.getRiderDetails(req as any, res, next)
);

router.post('/register', authenticate, (req, res, next) => riderController.registerRider(req as any, res, next));
router.get('/profile', authenticate, (req, res, next) => riderController.getRiderProfile(req as any, res, next));
router.post('/location', authenticate, (req, res, next) => riderController.updateLocation(req as any, res, next));
router.post('/online', authenticate, (req, res, next) => riderController.goOnline(req as any, res, next));
router.post('/offline', authenticate, (req, res, next) => riderController.goOffline(req as any, res, next));

export default router;
