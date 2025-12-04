/**
 * Currency and parameter conversion utilities
 * Converts USD amounts to JPY and parameter sizes to Japanese notation
 */

/**
 * 単位の倍率定義
 */
const UNIT_MULTIPLIERS: Record<string, number> = {
  k: 1e3,       // Thousand (千)
  K: 1e3,
  m: 1e6,       // Million (百万)
  M: 1e6,
  b: 1e9,       // Billion (十億)
  B: 1e9,
  t: 1e12,      // Trillion (兆)
  T: 1e12,
};

/**
 * ドル表記の正規表現パターン
 * - $20, $100, $1,000.50
 * - $100K, $50M, $1.5B, $2T
 * - 50B dollar, 100M USD, 20K dollars
 * - USD 100, US$ 50
 */
const USD_PATTERNS = [
  // $XX または $XX.XX (K/M/B/T付きも含む)
  /\$\s*([\d,]+(?:\.\d{1,2})?)\s*([KkMmBbTt])?\s*(?:USD|dollars?|bucks?)?/gi,
  // USD XX または US$ XX
  /(?:USD|US\s*\$)\s*([\d,]+(?:\.\d{1,2})?)\s*([KkMmBbTt])?/gi,
  // XXK/M/B/T dollar(s)/USD
  /([\d,]+(?:\.\d{1,2})?)\s*([KkMmBbTt])?\s*(?:USD|US\s*dollars?|dollars?)/gi,
];

/**
 * パラメータサイズの正規表現パターン
 * - 140B, 7B, 1.5B (数字 + B/M/T のみ、単体)
 * - parameters/params キーワード付きも対応
 */
const PARAM_PATTERNS = [
  // XX B/M/T parameters (キーワード付き)
  /([\d.]+)\s*([BbMmTt])(?:illion)?\s*(?:parameters?|params?)/gi,
  // 単体の XX B/M/T (文脈で判断、数字の後にB/M/Tが続く)
  /\b([\d.]+)\s*([BbMmTt])\b(?!\s*(?:USD|dollars?|bucks?|\$|bytes?|bits?))/gi,
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
 * 数値を日本語単位で表記する
 * @param value 数値
 * @param includeYen 「円」を付けるか
 */
function formatJapaneseNumber(value: number, includeYen: boolean): string {
  const absValue = Math.abs(value);

  // 兆 (10^12)
  if (absValue >= 1e12) {
    const cho = value / 1e12;
    const formatted = cho % 1 === 0 ? cho.toFixed(0) : cho.toFixed(2).replace(/\.?0+$/, '');
    return `${formatted}兆${includeYen ? '円' : ''}`;
  }

  // 億 (10^8)
  if (absValue >= 1e8) {
    const oku = value / 1e8;
    const formatted = oku % 1 === 0 ? oku.toFixed(0) : oku.toFixed(2).replace(/\.?0+$/, '');
    return `${formatted}億${includeYen ? '円' : ''}`;
  }

  // 万 (10^4)
  if (absValue >= 1e4) {
    const man = value / 1e4;
    const formatted = man % 1 === 0 ? man.toFixed(0) : man.toFixed(0);
    return `${Number(formatted).toLocaleString('ja-JP')}万${includeYen ? '円' : ''}`;
  }

  // 千未満
  return `${value.toLocaleString('ja-JP')}${includeYen ? '円' : ''}`;
}

/**
 * ドル表記を正規化する（$XX, $XXK, $XXM, $XXB, $XXT形式に）
 * @param amount 数値
 * @param unit 単位（K/M/B/T）
 */
function normalizeUsdFormat(amount: number, unit: string | undefined): string {
  if (unit) {
    return `$${amount}${unit.toUpperCase()}`;
  }
  // カンマ区切りで表示
  return `$${amount.toLocaleString('en-US')}`;
}

/**
 * パラメータ表記を正規化する（XXB, XXM, XXT形式に）
 * @param amount 数値
 * @param unit 単位（B/M/T）
 */
function normalizeParamFormat(amount: number, unit: string): string {
  return `${amount}${unit.toUpperCase()}`;
}

/**
 * Convert USD amounts to JPY in text
 * 例: $20 -> $20 (3,100円), $100K -> $100K (1,550万円)
 */
export function convertUsdToJpy(text: string, rate: number): ConversionResult {
  const conversions: ConversionResult['conversions'] = [];
  let result = text;

  // 既に変換済みの箇所をスキップするためのマーカー
  const processedRanges: Array<{ start: number; end: number }> = [];

  for (const pattern of USD_PATTERNS) {
    // パターンごとにリセット
    pattern.lastIndex = 0;

    result = result.replace(pattern, (match, amountStr: string, unit: string | undefined, offset: number) => {
      // 既に処理済みの範囲かチェック
      const matchEnd = offset + match.length;
      if (processedRanges.some(r => offset >= r.start && offset < r.end)) {
        return match;
      }

      // 既に変換済み（括弧付き円表記がある）かチェック
      if (/\([^)]*円\)/.test(match)) {
        return match;
      }

      const cleanAmount = amountStr.replace(/,/g, '');
      const numericAmount = parseFloat(cleanAmount);
      if (isNaN(numericAmount)) {
        return match;
      }

      // 単位の倍率を適用
      let totalUsd = numericAmount;
      if (unit && UNIT_MULTIPLIERS[unit] !== undefined) {
        totalUsd = numericAmount * UNIT_MULTIPLIERS[unit];
      }

      const jpyAmount = Math.round(totalUsd * rate);
      const formattedJpy = formatJapaneseNumber(jpyAmount, true);

      // 正規化されたドル表記
      const normalizedUsd = normalizeUsdFormat(numericAmount, unit);

      const converted = `${normalizedUsd} (${formattedJpy})`;

      conversions.push({
        original: match,
        converted,
        type: 'currency',
      });

      // 処理済み範囲を記録
      processedRanges.push({ start: offset, end: matchEnd });

      return converted;
    });
  }

  return { text: result, conversions };
}

/**
 * Add Japanese descriptions for parameter counts
 * 例: 140B -> 140B (1,400億), 7B -> 7B (70億)
 */
export function addParamDescriptions(text: string): ConversionResult {
  const conversions: ConversionResult['conversions'] = [];
  let result = text;

  // 既に変換済みの箇所をスキップするためのセット
  const processedMatches = new Set<string>();

  for (const pattern of PARAM_PATTERNS) {
    pattern.lastIndex = 0;

    result = result.replace(pattern, (match, amountStr: string, unit: string) => {
      // 既に変換済み（括弧付き日本語表記がある）かチェック
      if (/\([^)]*[億万]\)/.test(match)) {
        return match;
      }

      // 同じマッチを二重処理しないようにする
      if (processedMatches.has(match)) {
        return match;
      }

      const numericAmount = parseFloat(amountStr);
      if (isNaN(numericAmount)) {
        return match;
      }

      // 単位に基づいて日本語の数値を計算
      let japaneseValue: number;
      const upperUnit = unit.toUpperCase();

      switch (upperUnit) {
        case 'T': // Trillion = 兆
          japaneseValue = numericAmount * 1e12;
          break;
        case 'B': // Billion = 十億
          japaneseValue = numericAmount * 1e9;
          break;
        case 'M': // Million = 百万
          japaneseValue = numericAmount * 1e6;
          break;
        default:
          return match;
      }

      const formattedJapanese = formatJapaneseNumber(japaneseValue, false);

      // 正規化されたパラメータ表記
      const normalizedParam = normalizeParamFormat(numericAmount, unit);

      const converted = `${normalizedParam} (${formattedJapanese})`;

      conversions.push({
        original: match,
        converted,
        type: 'params',
      });

      processedMatches.add(match);

      return converted;
    });
  }

  return { text: result, conversions };
}

/**
 * Apply all conversions to translated text
 */
export function applyConversions(
  text: string,
  options: {
    usdToJpy?: { enabled: boolean; rate: number };
    paramConversion?: { enabled: boolean };
  }
): string {
  let result = text;

  // Apply USD to JPY conversion
  if (options.usdToJpy?.enabled) {
    const currencyResult = convertUsdToJpy(result, options.usdToJpy.rate);
    result = currencyResult.text;
  }

  // Apply parameter conversion
  if (options.paramConversion?.enabled) {
    const paramResult = addParamDescriptions(result);
    result = paramResult.text;
  }

  return result;
}
