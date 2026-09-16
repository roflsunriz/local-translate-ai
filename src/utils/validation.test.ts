import { describe, expect, it } from 'vitest';

import { isLoopbackHostname, validateApiEndpoint } from './validation';

describe('isLoopbackHostname', () => {
  it.each(['localhost', 'LOCALHOST', '127.0.0.1', '127.0.0.2', '127.1.2.3', '::1', '[::1]'])(
    'treats %s as loopback',
    (hostname) => {
      expect(isLoopbackHostname(hostname)).toBe(true);
    }
  );

  it.each(['example.com', '192.168.1.1', '10.0.0.1', '128.0.0.1', '127.0.0.300', ''])(
    'does not treat %s as loopback',
    (hostname) => {
      expect(isLoopbackHostname(hostname)).toBe(false);
    }
  );
});

describe('validateApiEndpoint', () => {
  it('allows loopback hosts over HTTP', () => {
    expect(validateApiEndpoint('http://localhost:8080/v1/chat/completions').valid).toBe(true);
    expect(validateApiEndpoint('http://127.0.0.1:8080/v1/chat/completions').valid).toBe(true);
    expect(validateApiEndpoint('http://[::1]:8080/v1/chat/completions').valid).toBe(true);
  });

  it('rejects non-loopback hosts over HTTP', () => {
    expect(validateApiEndpoint('http://192.168.1.10:8080/v1/chat/completions').valid).toBe(false);
  });

  it('allows non-loopback hosts over HTTPS', () => {
    expect(validateApiEndpoint('https://example.com/v1/chat/completions').valid).toBe(true);
  });

  it('rejects invalid URLs', () => {
    expect(validateApiEndpoint('not a url').valid).toBe(false);
  });
});
