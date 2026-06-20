import { Router } from 'express';
import { orderController } from '../controllers/orderController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.post('/', (req, res, next) => orderController.createOrder(req as any, res, next));
router.get('/:orderId', (req, res, next) => orderController.getOrder(req as any, res, next));
router.get('/:orderId/track', (req, res, next) => orderController.trackOrder(req as any, res, next));
router.post('/:orderId/cancel', (req, res, next) => orderController.cancelOrder(req as any, res, next));

export default router;
