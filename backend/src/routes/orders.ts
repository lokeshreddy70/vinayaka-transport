import { Router } from 'express';
import { orderController } from '../controllers/orderController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.get('/public/:orderNumber/track', (req, res, next) => orderController.publicTrack(req, res, next));

router.use(authenticate);

router.get('/', (req, res, next) => orderController.listOrders(req as any, res, next));
router.post('/', (req, res, next) => orderController.createOrder(req as any, res, next));
router.post('/:orderId/assign-rider', authorize('ADMIN', 'FRANCHISE_MANAGER'), (req, res, next) =>
	orderController.assignRider(req as any, res, next)
);
router.post('/:orderId/status', (req, res, next) => orderController.updateStatus(req as any, res, next));
router.get('/:orderId', (req, res, next) => orderController.getOrder(req as any, res, next));
router.get('/:orderId/track', (req, res, next) => orderController.trackOrder(req as any, res, next));
router.get('/:orderId/qr', (req, res, next) => orderController.getOrderQR(req as any, res, next));
router.get('/:orderId/barcode', (req, res, next) => orderController.getOrderBarcode(req as any, res, next));
router.get('/:orderId/receipt', (req, res, next) => orderController.getOrderReceipt(req as any, res, next));
router.post('/:orderId/cancel', (req, res, next) => orderController.cancelOrder(req as any, res, next));

export default router;
