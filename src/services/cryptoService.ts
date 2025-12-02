/**
 * Crypto Service - Handles encryption/decryption of sensitive data
 * Uses Web Crypto API for secure storage of API keys
 */

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12;
const SALT_LENGTH = 16;
const ITERATIONS = 100000;

// Derive key from extension ID (consistent across sessions)
async function deriveKey(salt: ArrayBuffer): Promise<CryptoKey> {
  // Use extension ID as password base
  const extensionId = browser.runtime.id || 'local-translate-ai-default';
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(extensionId);

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    {
      name: ALGORITHM,
      length: KEY_LENGTH,
    },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt a string value
 */
export async function encrypt(plaintext: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);

  // Generate random salt and IV
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

  // Derive key
  const key = await deriveKey(salt.buffer as ArrayBuffer);

  // Encrypt
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: ALGORITHM,
      iv,
    },
    key,
    data
  );

  // Combine salt + iv + ciphertext
  const combined = new Uint8Array(SALT_LENGTH + IV_LENGTH + ciphertext.byteLength);
  combined.set(salt, 0);
  combined.set(iv, SALT_LENGTH);
  combined.set(new Uint8Array(ciphertext), SALT_LENGTH + IV_LENGTH);

  // Encode as base64
  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypt an encrypted string
 */
export async function decrypt(encryptedData: string): Promise<string> {
  // Decode from base64
  const combined = new Uint8Array(
    atob(encryptedData)
      .split('')
      .map((c) => c.charCodeAt(0))
  );

  // Extract salt, iv, and ciphertext
  const salt = combined.slice(0, SALT_LENGTH);
  const iv = combined.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const ciphertext = combined.slice(SALT_LENGTH + IV_LENGTH);

  // Derive key
  const key = await deriveKey(salt.buffer.slice(salt.byteOffset, salt.byteOffset + salt.byteLength) as ArrayBuffer);

  // Decrypt
  const decrypted = await crypto.subtle.decrypt(
    {
      name: ALGORITHM,
      iv,
    },
    key,
    ciphertext
  );

  // Decode to string
  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}

/**
 * Check if a string is encrypted (base64 encoded with correct length)
 */
export function isEncrypted(value: string): boolean {
  try {
    const decoded = atob(value);
    // Minimum length: salt + iv + at least 1 byte of data
    return decoded.length >= SALT_LENGTH + IV_LENGTH + 1;
  } catch {
    return false;
  }
}

