import bcryptjs from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import config from '../config';

export const generateOTP = (length: number = 6): string => {
  const digits = '0123456789';
  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += digits[Math.floor(Math.random() * 10)];
  }
  return otp;
};

export const getOTPExpiry = (minutes: number): Date => {
  const expiry = new Date();
  expiry.setMinutes(expiry.getMinutes() + minutes);
  return expiry;
};

export const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcryptjs.genSalt(10);
  return bcryptjs.hash(password, salt);
};

export const comparePassword = async (password: string, hashedPassword: string): Promise<boolean> => {
  return bcryptjs.compare(password, hashedPassword);
};

export const normalizePhoneNumber = (value: string): string => {
  const trimmed = value.trim();
  const digits = trimmed.replace(/[^\d+]/g, '');

  if (digits.startsWith('+')) {
    const normalized = `+${digits.slice(1).replace(/\D/g, '')}`;
    if (!/^\+[1-9]\d{7,14}$/.test(normalized)) {
      throw new Error('Invalid international phone number format');
    }
    return normalized;
  }

  const onlyDigits = digits.replace(/\D/g, '');
  if (/^\d{10}$/.test(onlyDigits)) {
    return `+91${onlyDigits}`;
  }

  if (/^[1-9]\d{7,14}$/.test(onlyDigits)) {
    return `+${onlyDigits}`;
  }

  throw new Error('Invalid phone number format');
};

const digestOtp = (phoneNumber: string, otp: string): string => {
  return crypto
    .createHmac('sha256', config.jwt.secret)
    .update(`${phoneNumber}:${otp}`)
    .digest('hex');
};

interface OtpChallengePayload {
  purpose: 'otp_challenge';
  phoneNumber: string;
  otpDigest: string;
}

export const createOtpChallengeToken = (phoneNumber: string, otp: string, expiresInMinutes: number): string => {
  const payload: OtpChallengePayload = {
    purpose: 'otp_challenge',
    phoneNumber,
    otpDigest: digestOtp(phoneNumber, otp),
  };

  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: `${expiresInMinutes}m`,
  });
};

export const verifyOtpChallengeToken = (
  token: string,
  phoneNumber: string,
  otp: string
): boolean => {
  try {
    const decoded = jwt.verify(token, config.jwt.secret) as OtpChallengePayload;

    if (decoded.purpose !== 'otp_challenge') {
      return false;
    }

    if (decoded.phoneNumber !== phoneNumber) {
      return false;
    }

    return decoded.otpDigest === digestOtp(phoneNumber, otp);
  } catch {
    return false;
  }
};
