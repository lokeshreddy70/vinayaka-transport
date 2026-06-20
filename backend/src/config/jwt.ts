import jwt from 'jsonwebtoken';
import config from './index';

export interface JWTPayload {
  userId: string;
  phoneNumber: string;
  role: string;
  deviceId?: string;
  iat?: number;
  exp?: number;
}

export const generateAccessToken = (payload: Omit<JWTPayload, 'iat' | 'exp'>): string => {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiry,
  });
};

export const generateRefreshToken = (payload: Omit<JWTPayload, 'iat' | 'exp'>): string => {
  return jwt.sign(payload, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiry,
  });
};

export const verifyAccessToken = (token: string): JWTPayload => {
  try {
    return jwt.verify(token, config.jwt.secret) as JWTPayload;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};

export const verifyRefreshToken = (token: string): JWTPayload => {
  try {
    return jwt.verify(token, config.jwt.refreshSecret) as JWTPayload;
  } catch (error) {
    throw new Error('Invalid or expired refresh token');
  }
};
