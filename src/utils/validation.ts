/**
 * Validation utilities
 */

/**
 * Validate API endpoint URL
 * - Loopback URLs (localhost, 127.0.0.0/8, ::1) are allowed without HTTPS
 * - All other URLs must use HTTPS
 */
export function isLoopbackHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase();
  if (normalized === 'localhost') {
    return true;
  }
  if (normalized === '::1' || normalized === '[::1]') {
    return true;
  }
  const ipv4Parts = normalized.split('.');
  if (ipv4Parts.length === 4 && ipv4Parts[0] === '127') {
    return ipv4Parts.every((part) => /^\d{1,3}$/.test(part) && Number(part) >= 0 && Number(part) <= 255);
  }
  return false;
}

export function validateApiEndpoint(url: string): { valid: boolean; error?: string } {
  try {
    const parsed = new URL(url);

    // Allow loopback without HTTPS
    if (isLoopbackHostname(parsed.hostname)) {
      return { valid: true };
    }

    // Require HTTPS for all other hosts
    if (parsed.protocol !== 'https:') {
      return {
        valid: false,
        error: 'localhost以外のエンドポイントにはHTTPSが必須です',
      };
    }

    return { valid: true };
  } catch {
    return {
      valid: false,
      error: '無効なURL形式です',
    };
  }
}

/**
 * Check if text matches any exclusion pattern
 */
export function matchesExclusionPattern(
  text: string,
  patterns: Array<{ pattern: string; enabled: boolean }>
): boolean {
  for (const { pattern, enabled } of patterns) {
    if (!enabled) {
      continue;
    }

    try {
      const regex = new RegExp(pattern, 'g');
      if (regex.test(text)) {
        return true;
      }
    } catch {
      // Invalid regex, skip
      console.warn(`Invalid exclusion pattern: ${pattern}`);
    }
  }
  return false;
}

/**
 * Remove excluded parts from text
 */
export function removeExcludedParts(
  text: string,
  patterns: Array<{ pattern: string; enabled: boolean }>
): { cleanedText: string; excludedParts: Array<{ match: string; index: number }> } {
  const excludedParts: Array<{ match: string; index: number }> = [];
  let cleanedText = text;

  for (const { pattern, enabled } of patterns) {
    if (!enabled) {
      continue;
    }

    try {
      const regex = new RegExp(pattern, 'g');
      let match;
      while ((match = regex.exec(text)) !== null) {
        excludedParts.push({
          match: match[0],
          index: match.index,
        });
      }
      cleanedText = cleanedText.replace(regex, '{{EXCLUDED}}');
    } catch {
      // Invalid regex, skip
    }
  }

  return { cleanedText, excludedParts };
}

