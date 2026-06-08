import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

export interface JwtPayload {
  userId: string;
  openid: string;
  isAdmin?: boolean;
}

/**
 * Generate JWT token for user
 */
export function generateToken(payload: JwtPayload): string {
  return jwt.sign(
    payload,
    JWT_SECRET,
    { expiresIn: '7d' } as jwt.SignOptions
  );
}

/**
 * Verify JWT token
 */
export function verifyToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Hash password
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

/**
 * Compare password with hash
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate random token
 */
export function generateRandomToken(length: number = 32): string {
  return randomBytes(length).toString('hex');
}
