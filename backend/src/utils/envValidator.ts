import logger from '../config/logger';

export interface EnvironmentRequirement {
  name: string;
  required: boolean;
  description: string;
  validate?: (value: string | undefined) => boolean;
}

const ENVIRONMENT_REQUIREMENTS: EnvironmentRequirement[] = [
  {
    name: 'NODE_ENV',
    required: false,
    description: 'Runtime environment (development|production|test)',
  },
  {
    name: 'DATABASE_URL',
    required: false,
    description: 'PostgreSQL connection string',
    validate: (val) => {
      if (!val) return true;
      return val.startsWith('postgresql://') || val.startsWith('postgres://');
    },
  },
  {
    name: 'SUPABASE_DATABASE_URL',
    required: false,
    description: 'Supabase Postgres connection string',
    validate: (val) => {
      if (!val) return true;
      return val.startsWith('postgresql://') || val.startsWith('postgres://');
    },
  },
  {
    name: 'SUPABASE_DB_URL',
    required: false,
    description: 'Supabase Postgres connection string (alias)',
    validate: (val) => {
      if (!val) return true;
      return val.startsWith('postgresql://') || val.startsWith('postgres://');
    },
  },
  {
    name: 'SUPABASE_POOLER_URL',
    required: false,
    description: 'Supabase pooled Postgres connection string',
    validate: (val) => {
      if (!val) return true;
      return val.startsWith('postgresql://') || val.startsWith('postgres://');
    },
  },
  {
    name: 'JWT_SECRET',
    required: true,
    description: 'JWT signing secret (32+ chars in production)',
    validate: (val) => {
      if (!val) return false;
      const env = process.env.NODE_ENV || 'development';
      if (env === 'production' && val.length < 32) return false;
      return true;
    },
  },
  {
    name: 'JWT_REFRESH_SECRET',
    required: true,
    description: 'JWT refresh token secret (32+ chars in production)',
    validate: (val) => {
      if (!val) return false;
      const env = process.env.NODE_ENV || 'development';
      if (env === 'production' && val.length < 32) return false;
      return true;
    },
  },
  {
    name: 'PORT',
    required: false,
    description: 'Server port (default: 3001)',
    validate: (val) => {
      if (!val) return true;
      const port = Number.parseInt(val, 10);
      return port > 0 && port < 65535;
    },
  },
  {
    name: 'OTP_EXPIRY',
    required: false,
    description: 'OTP expiration time in minutes (default: 10)',
    validate: (val) => {
      if (!val) return true;
      const min = Number.parseInt(val, 10);
      return min > 0 && min <= 60;
    },
  },
  {
    name: 'OTP_LENGTH',
    required: false,
    description: 'OTP length in digits (default: 6)',
    validate: (val) => {
      if (!val) return true;
      const len = Number.parseInt(val, 10);
      return len >= 4 && len <= 8;
    },
  },
  {
    name: 'CORS_ORIGIN',
    required: false,
    description: 'CORS allowed origins (default: *)',
  },
];

export class EnvironmentValidator {
  private static resolveDatabaseUrl(): string | null {
    const value =
      process.env.SUPABASE_DATABASE_URL?.trim() ||
      process.env.SUPABASE_DB_URL?.trim() ||
      process.env.SUPABASE_POOLER_URL?.trim() ||
      process.env.DATABASE_URL?.trim() ||
      '';

    return value || null;
  }

  static validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    const databaseUrl = this.resolveDatabaseUrl();
    if (!databaseUrl) {
      errors.push(
        'Missing required database URL. Set one of SUPABASE_DATABASE_URL, SUPABASE_DB_URL, SUPABASE_POOLER_URL, or DATABASE_URL.'
      );
    }

    for (const req of ENVIRONMENT_REQUIREMENTS) {
      const value = process.env[req.name]?.trim();
      const isProduction = process.env.NODE_ENV === 'production';

      if (req.required && !value) {
        errors.push(`Missing required environment variable: ${req.name} - ${req.description}`);
        continue;
      }

      if (value && req.validate) {
        if (!req.validate(value)) {
          errors.push(`Invalid value for ${req.name} - ${req.description}`);
        }
      }
    }

    // Production-specific checks
    if (process.env.NODE_ENV === 'production') {
      const twilioSid = process.env.TWILIO_ACCOUNT_SID?.trim();
      const twilioToken = process.env.TWILIO_AUTH_TOKEN?.trim();
      const twilioPhone = process.env.TWILIO_PHONE_NUMBER?.trim();

      if (!twilioSid || !twilioToken || !twilioPhone) {
        errors.push(
          'Production deployment requires Twilio credentials: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER'
        );
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  static validateOrThrow(): void {
    const result = this.validate();
    if (!result.valid) {
      logger.error({ errors: result.errors }, 'Environment validation failed');
      result.errors.forEach((err) => {
        logger.error(err);
      });
      throw new Error(
        `Environment configuration error:\n${result.errors.join('\n')}\n\nPlease check your .env file and try again.`
      );
    }
  }

  static logConfiguration(): void {
    logger.info('=== Environment Configuration ===');
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`Port: ${process.env.PORT || 3001}`);
    const dbUrl = this.resolveDatabaseUrl();
    logger.info(`Database: ${dbUrl ? `${dbUrl.substring(0, 50)}...` : 'Not configured'}`);
    logger.info(`Twilio Configured: ${Boolean(process.env.TWILIO_ACCOUNT_SID)}`);
    logger.info(`CORS Origin: ${process.env.CORS_ORIGIN || '*'}`);
    logger.info('==================================');
  }

  static getReport(): string {
    const result = this.validate();
    const lines = [
      '╔════════════════════════════════════════════════════════╗',
      '║   ENVIRONMENT CONFIGURATION REPORT                    ║',
      '╚════════════════════════════════════════════════════════╝',
      '',
      `Status: ${result.valid ? '✅ VALID' : '❌ INVALID'}`,
      '',
    ];

    if (result.valid) {
      lines.push('All environment variables are properly configured.');
    } else {
      lines.push('⚠️  Configuration Errors:');
      result.errors.forEach((err) => {
        lines.push(`  • ${err}`);
      });
    }

    lines.push(
      '',
      `Environment: ${process.env.NODE_ENV || 'development'}`,
      `Server Port: ${process.env.PORT || 3001}`,
      `Twilio OTP: ${process.env.TWILIO_ACCOUNT_SID ? '✅ Configured' : '❌ Not Configured'}`
    );

    return lines.join('\n');
  }
}
