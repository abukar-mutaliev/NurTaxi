import { createCipheriv, createDecipheriv, createHmac, createHash } from 'node:crypto';

const PREFIX = 'enc:v1:';
const ALGO = 'aes-256-gcm';

function resolveKey(): Buffer {
  const raw = process.env.FIELD_ENCRYPTION_KEY;
  if (raw && raw.length >= 32) {
    return createHash('sha256').update(raw).digest();
  }
  const env = process.env.NODE_ENV ?? 'development';
  if (env === 'production' || env === 'staging') {
    throw new Error('FIELD_ENCRYPTION_KEY обязателен в staging/production (FZ-08.16)');
  }
  return createHash('sha256').update('nurtaxi-dev-field-encryption-key').digest();
}

function ivFor(plaintext: string, key: Buffer): Buffer {
  return createHmac('sha256', key).update(`iv:${plaintext}`).digest().subarray(0, 12);
}

/** Детерминированное AES-256-GCM: одинаковый plaintext даёт одинаковый ciphertext (уникальные индексы). */
export function encryptField(value: string | null | undefined): string | null {
  if (value == null || value === '') return value ?? null;
  if (value.startsWith(PREFIX)) return value;
  const key = resolveKey();
  const iv = ivFor(value, key);
  const cipher = createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString('base64url')}.${tag.toString('base64url')}.${encrypted.toString('base64url')}`;
}

export function decryptField(value: string | null | undefined): string | null {
  if (value == null || value === '') return value ?? null;
  if (!value.startsWith(PREFIX)) return value;
  const key = resolveKey();
  const payload = value.slice(PREFIX.length);
  const [ivB64, tagB64, dataB64] = payload.split('.');
  if (!ivB64 || !tagB64 || !dataB64) return value;
  const decipher = createDecipheriv(ALGO, key, Buffer.from(ivB64, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}

export const encryptedTransformer = {
  to: (value: string | null | undefined) => encryptField(value),
  from: (value: string | null | undefined) => decryptField(value),
};
