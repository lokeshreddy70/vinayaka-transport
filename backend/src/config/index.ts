import * as fs from 'fs';
import * as path from 'path';

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
}

const config: Config = {
  database: {
    url: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/vinayaka_transport',
  },
  server: {
    port: parseInt(process.env.PORT || '3001', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'your_jwt_secret_key_change_in_production',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'your_jwt_refresh_secret_change_in_production',
    expiry: process.env.JWT_EXPIRY || '1h',
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
  },
  otp: {
    expiry: parseInt(process.env.OTP_EXPIRY || '10', 10),
    length: parseInt(process.env.OTP_LENGTH || '6', 10),
  },
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID || '',
    authToken: process.env.TWILIO_AUTH_TOKEN || '',
    phoneNumber: process.env.TWILIO_PHONE_NUMBER || '',
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
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },
};

export default config;
