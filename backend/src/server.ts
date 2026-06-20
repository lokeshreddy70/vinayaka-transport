import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import 'express-async-errors';

import config from './config';
import logger from './config/logger';
import { apiLimiter } from './middleware/rateLimiter';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { sendSuccess } from './utils/response';

// Routes
import authRoutes from './routes/auth';
import customerRoutes from './routes/customer';
import orderRoutes from './routes/orders';
import riderRoutes from './routes/riders';

const app: Express = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(apiLimiter);

// Health check
app.get('/health', (req: Request, res: Response) => {
  sendSuccess(res, 200, 'Server is running', { timestamp: new Date() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/riders', riderRoutes);

// 404 Handler
app.use(notFoundHandler);

// Error Handler
app.use(errorHandler);

// Start Server
const PORT = config.server.port;
app.listen(PORT, () => {
  logger.info(`🚀 Vinayaka Transport Backend running on port ${PORT}`);
  logger.info(`Environment: ${config.server.nodeEnv}`);
});

export default app;
