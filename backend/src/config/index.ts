interface Config {
  database: {
    url: string;
  };
  server: {
    port: number;
    nodeEnv: string;
  };
  jwt: {
    secret: string;
    refreshSecret: string;
    expiry: string;
    refreshExpiry: string;
  };
  otp: {
    expiry: number;
    length: number;
    maxResendPerWindow: number;
    maxVerifyAttempts: number;
    resendWindowMinutes: number;
  };
  twilio: {
    accountSid: string;
    authToken: string;
    phoneNumber: string;
  };
  googleMaps: {
    apiKey: string;
  };
  aws: {
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
    s3Bucket: string;
  };
  redis: {
    url: string;
  };
  rateLimit: {
    windowMs: number;
    maxRequests: number;
  };
  cors: {
    origin: string;
    origins: string[];
  };
  socket: {
    origins: string[];
  };
  body: {
    jsonLimit: string;
    urlEncodedLimit: string;
  };
}

const parseIntEnv = (name: string, fallback: number): number => {
  const value = process.env[name];
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid numeric value for ${name}`);
  }

  return parsed;
};

const isProduction = process.env.NODE_ENV === 'production';

const requireEnv = (name: string, allowInNonProduction: boolean = true): string => {
  const value = process.env[name]?.trim();

  if (value) {
    return value;
  }

  if (!isProduction && allowInNonProduction) {
    return '';
  }

  throw new Error(`Missing required environment variable: ${name}`);
};

const validateSecrets = (): void => {
  const jwtSecret = process.env.JWT_SECRET?.trim();
  const refreshSecret = process.env.JWT_REFRESH_SECRET?.trim();

  if (!jwtSecret || !refreshSecret) {
    throw new Error('JWT_SECRET and JWT_REFRESH_SECRET are required');
  }

  if (isProduction) {
    if (jwtSecret.length < 32 || refreshSecret.length < 32) {
      throw new Error('JWT secrets must be at least 32 characters in production');
    }

    const weakPatterns = ['your_jwt_secret', 'change_in_production', 'secret'];
    const combined = `${jwtSecret} ${refreshSecret}`.toLowerCase();
    if (weakPatterns.some((pattern) => combined.includes(pattern))) {
      throw new Error('Weak JWT secrets detected. Configure strong random secrets for production');
    }
  }
};

validateSecrets();

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) {
  throw new Error('Missing required environment variable: DATABASE_URL');
}

const jwtSecret = requireEnv('JWT_SECRET', false);
const jwtRefreshSecret = requireEnv('JWT_REFRESH_SECRET', false);

const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID?.trim() || '';
const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN?.trim() || '';
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER?.trim() || '';

if (isProduction && (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber)) {
  throw new Error(
    'TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_PHONE_NUMBER are required in production for OTP delivery'
  );
}

const config: Config = {
  database: {
    url: databaseUrl,
  },
  server: {
    port: parseIntEnv('PORT', 3001),
    nodeEnv: process.env.NODE_ENV || 'development',
  },
  jwt: {
    secret: jwtSecret,
    refreshSecret: jwtRefreshSecret,
    expiry: process.env.JWT_EXPIRY || '1h',
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
  },
  otp: {
    expiry: parseIntEnv('OTP_EXPIRY', 10),
    length: parseIntEnv('OTP_LENGTH', 6),
    maxResendPerWindow: parseIntEnv('OTP_MAX_RESEND_PER_WINDOW', 5),
    maxVerifyAttempts: parseIntEnv('OTP_MAX_VERIFY_ATTEMPTS', 5),
    resendWindowMinutes: parseIntEnv('OTP_RESEND_WINDOW_MINUTES', 10),
  },
  twilio: {
    accountSid: twilioAccountSid,
    authToken: twilioAuthToken,
    phoneNumber: twilioPhoneNumber,
  },
  googleMaps: {
    apiKey: process.env.GOOGLE_MAPS_API_KEY || '',
  },
  aws: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    region: process.env.AWS_REGION || 'ap-south-1',
    s3Bucket: process.env.AWS_S3_BUCKET || '',
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
  rateLimit: {
    windowMs: parseIntEnv('RATE_LIMIT_WINDOW_MS', 900000),
    maxRequests: parseIntEnv('RATE_LIMIT_MAX_REQUESTS', 100),
  },
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    origins: (process.env.CORS_ORIGIN || '*')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean),
  },
  socket: {
    origins: (process.env.SOCKET_CORS_ORIGIN || process.env.CORS_ORIGIN || '*')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean),
  },
  body: {
    jsonLimit: process.env.BODY_JSON_LIMIT || '1mb',
    urlEncodedLimit: process.env.BODY_URLENCODED_LIMIT || '1mb',
  },
};

export default config;
