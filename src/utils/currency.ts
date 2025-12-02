/**
 * Currency conversion utilities
 * Converts USD amounts to JPY in translated text
 */

// Regex patterns for USD amounts
const USD_PATTERNS = [
  /\$\s*([\d,]+(?:\.\d{1,2})?)\s*(?:USD|dollars?|bucks?)?/gi,
  /(?:USD|US\s*\$)\s*([\d,]+(?:\.\d{1,2})?)/gi,
  /([\d,]+(?:\.\d{1,2})?)\s*(?:USD|US\s*dollars?)/gi,
];

// Regex patterns for parameter counts (B = billion, M = million)
const PARAM_PATTERNS = [
  /([\d.]+)\s*[Bb](?:illion)?\s*(?:parameters?|params?)/gi,
  /([\d.]+)\s*[Mm](?:illion)?\s*(?:parameters?|params?)/gi,
];

interface ConversionResult {
  text: string;
  conversions: Array<{
    original: string;
    converted: string;
    type: 'currency' | 'params';
  }>;
}

/**
 * Convert USD amounts to JPY in text
 */
export function convertUsdToJpy(text: string, rate: number): ConversionResult {
  const conversions: ConversionResult['conversions'] = [];
  let result = text;

  for (const pattern of USD_PATTERNS) {
    result = result.replace(pattern, (match, amount: string) => {
      const numericAmount = parseFloat(amount.replace(/,/g, ''));
      if (isNaN(numericAmount)) {
        return match;
      }

      const jpyAmount = Math.round(numericAmount * rate);
      const formattedJpy = jpyAmount.toLocaleString('ja-JP');
      const converted = `${match}（約${formattedJpy}円）`;

      conversions.push({
        original: match,
        converted,
        type: 'currency',
      });

      return converted;
    });
  }

  return { text: result, conversions };
}

/**
 * Add Japanese descriptions for parameter counts
 */
export function addParamDescriptions(text: string): ConversionResult {
  const conversions: ConversionResult['conversions'] = [];
  let result = text;

  // Billion parameters
  result = result.replace(PARAM_PATTERNS[0] ?? /(?!)/, (match, amount: string) => {
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount)) {
      return match;
    }

    const japaneseAmount = numericAmount * 10; // 1B = 10億
    const converted = `${match}（${japaneseAmount}億パラメータ）`;

    conversions.push({
      original: match,
      converted,
      type: 'params',
    });

    return converted;
  });

  // Million parameters
  result = result.replace(PARAM_PATTERNS[1] ?? /(?!)/, (match, amount: string) => {
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount)) {
      return match;
    }

    let japaneseDesc: string;
    if (numericAmount >= 1000) {
      japaneseDesc = `${numericAmount / 1000}億パラメータ`;
    } else if (numericAmount >= 100) {
      japaneseDesc = `${numericAmount / 100}千万パラメータ`;
    } else {
      japaneseDesc = `${numericAmount}百万パラメータ`;
    }

    const converted = `${match}（${japaneseDesc}）`;

    conversions.push({
      original: match,
      converted,
      type: 'params',
    });

    return converted;
  });

  return { text: result, conversions };
}

/**
 * Apply all conversions to translated text
 */
export function applyConversions(
  text: string,
  options: { usdToJpy?: { enabled: boolean; rate: number } }
): string {
  let result = text;

  // Apply USD to JPY conversion
  if (options.usdToJpy?.enabled) {
    const currencyResult = convertUsdToJpy(result, options.usdToJpy.rate);
    result = currencyResult.text;

    // Also add param descriptions when currency conversion is enabled
    const paramResult = addParamDescriptions(result);
    result = paramResult.text;
  }

  return result;
}

