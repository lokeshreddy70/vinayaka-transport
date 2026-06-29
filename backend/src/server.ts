// Load environment variables first!
import dotenv from 'dotenv';
dotenv.config();

import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import 'express-async-errors';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';

import config from './config';
import logger from './config/logger';
import { apiLimiter } from './middleware/rateLimiter';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { sendSuccess } from './utils/response';
import { setSocketServer } from './realtime/socket';
import { EnvironmentValidator } from './utils/envValidator';
import { HealthChecker } from './utils/healthChecker';

// Routes
import authRoutes from './routes/auth';
import customerRoutes from './routes/customer';
import orderRoutes from './routes/orders';
import riderRoutes from './routes/riders';

const app: Express = express();
const httpServer = createServer(app);

const resolveAllowedOrigins = (rawOrigins: string[]): string[] => {
  if (!rawOrigins.length) {
    return ['*'];
  }

  return rawOrigins;
};

const allowedOrigins = resolveAllowedOrigins(config.cors.origins);
const allowAllOrigins = allowedOrigins.includes('*');
const socketAllowedOrigins = resolveAllowedOrigins(config.socket.origins);
const allowAllSocketOrigins = socketAllowedOrigins.includes('*');

// Middleware
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowAllOrigins || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error('Origin not allowed by CORS'));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: config.body.jsonLimit }));
app.use(express.urlencoded({ limit: config.body.urlEncodedLimit, extended: true }));
app.use(apiLimiter);

// Health check
app.get('/health', (req: Request, res: Response) => {
  sendSuccess(res, 200, 'Server is running', { timestamp: new Date() });
});

// Health check endpoint with diagnostics
app.get('/health/detailed', async (req: Request, res: Response) => {
  const results = await HealthChecker.runAll();
  const allHealthy = results.every((r) => r.status === 'healthy');
  sendSuccess(res, allHealthy ? 200 : 503, 'Health check completed', { checks: results });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/riders', riderRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/customers', customerRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/riders', riderRoutes);

const io = new SocketIOServer(httpServer, {
  cors: {
    origin: (origin, callback) => {
      if (!origin || allowAllSocketOrigins || socketAllowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error('Socket origin not allowed'));
    },
    methods: ['GET', 'POST'],
  },
  transports: ['websocket', 'polling'],
  pingInterval: 25000,
  pingTimeout: 20000,
});

setSocketServer(io);

io.on('connection', (socket) => {
  socket.on('join:order', (orderId: string) => {
    if (orderId) {
      socket.join(`order:${orderId}`);
    }
  });

  socket.on('join:rider', (riderId: string) => {
    if (riderId) {
      socket.join(`rider:${riderId}`);
    }
  });
});

// 404 Handler
app.use(notFoundHandler);

// Error Handler
app.use(errorHandler);

// Start Server
async function startServer() {
  try {
    // Validate environment on startup
    EnvironmentValidator.validateOrThrow();
    EnvironmentValidator.logConfiguration();

    // Run health checks
    const healthResults = await HealthChecker.runAll();
    logger.info(HealthChecker.getReport(healthResults));

    const PORT = config.server.port;
    httpServer.listen(PORT, () => {
      logger.info(`🚀 Vinayaka Transport Backend running on port ${PORT}`);
      logger.info(`Environment: ${config.server.nodeEnv}`);
      logger.info(`API endpoints available at:`);
      logger.info(`  - /api/auth`);
      logger.info(`  - /api/customers`);
      logger.info(`  - /api/orders`);
      logger.info(`  - /api/riders`);
      logger.info(`  - /api/v1/* (versioned endpoints)`);
      logger.info(`Health check: GET /health`);
    });
  } catch (error) {
    logger.error({ error }, 'Failed to start server');
    if (error instanceof Error) {
      logger.error(error.message);
    }
    process.exit(1);
  }
}

startServer();

export default app;
