/**
 * Validation utilities
 */

/**
 * Validate API endpoint URL
 * - localhost URLs are allowed without HTTPS
 * - All other URLs must use HTTPS
 */
export function validateApiEndpoint(url: string): { valid: boolean; error?: string } {
  try {
    const parsed = new URL(url);

    // Allow localhost without HTTPS
    if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
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

