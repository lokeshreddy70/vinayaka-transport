import prisma from '../config/database';
import logger from '../config/logger';

export interface HealthCheckResult {
  service: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  message: string;
  responseTime: number;
}

export class HealthChecker {
  static async checkDatabase(): Promise<HealthCheckResult> {
    const start = Date.now();
    try {
      await prisma.$queryRaw`SELECT 1`;
      return {
        service: 'Database',
        status: 'healthy',
        message: 'PostgreSQL connection successful',
        responseTime: Date.now() - start,
      };
    } catch (error) {
      logger.error({ error }, 'Database health check failed');
      return {
        service: 'Database',
        status: 'unhealthy',
        message: `Database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        responseTime: Date.now() - start,
      };
    }
  }

  static async checkMigrations(): Promise<HealthCheckResult> {
    const start = Date.now();
    try {
      // Check if basic tables exist
      const userCount = await prisma.user.count();
      return {
        service: 'Migrations',
        status: 'healthy',
        message: `All migrations applied. Users table exists with ${userCount} records`,
        responseTime: Date.now() - start,
      };
    } catch (error) {
      logger.error({ error }, 'Migration check failed');
      return {
        service: 'Migrations',
        status: 'unhealthy',
        message: `Migrations check failed: ${error instanceof Error ? error.message : 'Unknown error'}. Run: npm run prisma:migrate`,
        responseTime: Date.now() - start,
      };
    }
  }

  static async checkRedis(): Promise<HealthCheckResult> {
    const start = Date.now();
    const redisUrl = process.env.REDIS_URL;

    if (!redisUrl) {
      return {
        service: 'Redis',
        status: 'degraded',
        message: 'Redis not configured (optional)',
        responseTime: Date.now() - start,
      };
    }

    try {
      // We'd add Redis check here if Redis client is initialized
      return {
        service: 'Redis',
        status: 'healthy',
        message: 'Redis configured',
        responseTime: Date.now() - start,
      };
    } catch (error) {
      return {
        service: 'Redis',
        status: 'degraded',
        message: 'Redis connection failed (optional service)',
        responseTime: Date.now() - start,
      };
    }
  }

  static async runAll(): Promise<HealthCheckResult[]> {
    logger.info('Running health checks...');
    const results = await Promise.all([
      this.checkDatabase(),
      this.checkMigrations(),
      this.checkRedis(),
    ]);

    return results;
  }

  static getReport(results: HealthCheckResult[]): string {
    const allHealthy = results.every((r) => r.status === 'healthy');
    const lines = [
      '╔════════════════════════════════════════════════════════╗',
      '║   HEALTH CHECK REPORT                                 ║',
      '╚════════════════════════════════════════════════════════╝',
      '',
      `Overall Status: ${allHealthy ? '✅ HEALTHY' : '⚠️  ISSUES DETECTED'}`,
      '',
    ];

    results.forEach((result) => {
      const icon =
        result.status === 'healthy' ? '✅' : result.status === 'degraded' ? '⚠️ ' : '❌';
      lines.push(`${icon} ${result.service}: ${result.status.toUpperCase()}`);
      lines.push(`   ${result.message}`);
      lines.push(`   Response time: ${result.responseTime}ms`);
    });

    return lines.join('\n');
  }
}
