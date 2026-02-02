import { randomBytes, createHmac, timingSafeEqual } from 'crypto';

function getSecretKey(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('SESSION_SECRET environment variable must be set with at least 32 characters');
  }
  return secret;
}

export function generateSecureToken(): string {
  return randomBytes(32).toString('hex');
}

export function generateDeviceSecret(): string {
  return randomBytes(48).toString('base64url');
}

export function generateDeterministicToken(serialNumber: string): string {
  return createHmac('sha256', getSecretKey())
    .update(serialNumber)
    .digest('base64url');
}

export function hashToken(token: string): string {
  return createHmac('sha256', getSecretKey())
    .update(token)
    .digest('hex');
}

export function verifyToken(providedToken: string, storedHash: string): boolean {
  const providedHash = hashToken(providedToken);
  try {
    return timingSafeEqual(
      Buffer.from(providedHash, 'hex'),
      Buffer.from(storedHash, 'hex')
    );
  } catch {
    return false;
  }
}

export function verifyHmac(payload: string, signature: string, secret: string): boolean {
  const expectedSignature = createHmac('sha256', secret).update(payload).digest('hex');
  try {
    return timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  } catch {
    return false;
  }
}

export function generateSessionToken(): string {
  return randomBytes(24).toString('base64url');
}
