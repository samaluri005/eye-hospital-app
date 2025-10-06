import { hash, verify } from '@node-rs/argon2';
import bcrypt from 'bcryptjs';

const ARGON2_OPTIONS = {
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
  outputLen: 32,
};

export async function hashPassword(password: string, salt: string): Promise<string> {
  const pepper = process.env.ARGON2_PEPPER;
  if (!pepper) {
    throw new Error('ARGON2_PEPPER not configured');
  }
  
  const combined = password + salt + pepper;
  return await hash(combined, ARGON2_OPTIONS);
}

export async function verifyPassword(
  password: string,
  salt: string,
  hashedPassword: string
): Promise<boolean> {
  const pepper = process.env.ARGON2_PEPPER;
  if (!pepper) {
    throw new Error('ARGON2_PEPPER not configured');
  }
  
  if (isLegacyBcryptHash(hashedPassword)) {
    return await bcrypt.compare(password + salt, hashedPassword);
  }
  
  const combined = password + salt + pepper;
  try {
    return await verify(hashedPassword, combined, ARGON2_OPTIONS);
  } catch {
    return false;
  }
}

export async function hashPin(pin: string, salt: string): Promise<string> {
  return hashPassword(pin, salt);
}

export async function verifyPin(
  pin: string,
  salt: string,
  hashedPin: string
): Promise<boolean> {
  return verifyPassword(pin, salt, hashedPin);
}

function isLegacyBcryptHash(hash: string): boolean {
  return hash.startsWith('$2a$') || hash.startsWith('$2b$') || hash.startsWith('$2y$');
}

export function needsPasswordUpgrade(hashedPassword: string): boolean {
  return isLegacyBcryptHash(hashedPassword);
}
