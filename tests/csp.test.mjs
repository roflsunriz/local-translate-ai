import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');

describe('extension CSP connect-src', () => {
  it('permits HTTP loopback endpoints such as 127.0.0.1 and IPv6 ::1', async () => {
    const manifest = JSON.parse(await readFile(resolve(rootDir, 'public/manifest.json'), 'utf8'));
    const csp = manifest.content_security_policy;
    expect(typeof csp).toBe('string');

    for (const origin of [
      'http://localhost:*',
      'http://127.0.0.1:*',
      'http://[::1]:*',
      'https://*',
    ]) {
      expect(csp).toContain(origin);
    }
  });
});
