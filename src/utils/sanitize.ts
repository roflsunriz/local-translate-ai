/**
 * Sanitization utilities for translation results
 * Removes unwanted artifacts from LLM output
 */

/**
 * Common chat template tokens that may leak into LLM output
 * Includes patterns from various chat formats:
 * - ChatML format: <|im_start|>, <|im_end|>
 * - Llama format: [INST], [/INST], <<SYS>>, <</SYS>>
 * - Other common patterns: <|endoftext|>, <|assistant|>, <|user|>, etc.
 */
const CHAT_TEMPLATE_PATTERNS: RegExp[] = [
  // ChatML format
  /<\|im_start\|>(?:system|user|assistant)?/gi,
  /<\|im_end\|>/gi,

  // Llama/Mistral format
  /\[INST\]/gi,
  /\[\/INST\]/gi,
  /<<SYS>>/gi,
  /<\/SYS>>/gi,
  /<\/?s>/gi,

  // Common special tokens
  /<\|endoftext\|>/gi,
  /<\|end\|>/gi,
  /<\|eot_id\|>/gi,
  /<\|start_header_id\|>(?:system|user|assistant)?<\|end_header_id\|>/gi,
  /<\|begin_of_text\|>/gi,

  // Role markers that might leak
  /<\|(?:system|user|assistant|human|bot)\|>/gi,

  // Generic angle bracket tokens (conservative - only specific patterns)
  /<\|[a-z_]+\|>/gi,
];

/**
 * Patterns that indicate incomplete/malformed output
 */
const INCOMPLETE_OUTPUT_PATTERNS: RegExp[] = [
  // Trailing incomplete tokens
  /<\|im_start$/i,
  /<\|im_$/i,
  /<\|$/i,
  /\[INST$/i,
  /<<SYS$/i,
];

/**
 * Remove chat template tokens from text
 * @param text - Text to sanitize
 * @returns Sanitized text with template tokens removed
 */
export function removeChatTemplateTokens(text: string): string {
  let result = text;

  // Remove complete template patterns
  for (const pattern of CHAT_TEMPLATE_PATTERNS) {
    result = result.replace(pattern, '');
  }

  // Remove incomplete trailing patterns
  for (const pattern of INCOMPLETE_OUTPUT_PATTERNS) {
    result = result.replace(pattern, '');
  }

  // Clean up any resulting multiple spaces or newlines
  result = result
    .replace(/\n{3,}/g, '\n\n')  // Max 2 consecutive newlines
    .replace(/ {2,}/g, ' ')       // Max 1 consecutive space
    .trim();

  return result;
}

/**
 * Check if text contains chat template tokens
 * @param text - Text to check
 * @returns true if template tokens are found
 */
export function containsChatTemplateTokens(text: string): boolean {
  for (const pattern of CHAT_TEMPLATE_PATTERNS) {
    // Reset lastIndex for global regex
    pattern.lastIndex = 0;
    if (pattern.test(text)) {
      return true;
    }
  }
  return false;
}

/**
 * Sanitize translation result
 * Applies all necessary sanitization steps to translation output
 * @param text - Raw translation result
 * @returns Sanitized translation result
 */
export function sanitizeTranslationResult(text: string): string {
  // Step 1: Remove chat template tokens
  let result = removeChatTemplateTokens(text);

  // Step 2: Remove any leading/trailing quotes that LLMs sometimes add
  result = removeWrappingQuotes(result);

  // Step 3: Remove common LLM prefixes/suffixes
  result = removeLLMPrefixes(result);

  return result;
}

/**
 * Remove wrapping quotes that LLMs sometimes add to translations
 */
function removeWrappingQuotes(text: string): string {
  const trimmed = text.trim();

  // Check for matching quotes at start and end
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'")) ||
    (trimmed.startsWith('「') && trimmed.endsWith('」')) ||
    (trimmed.startsWith('『') && trimmed.endsWith('』'))
  ) {
    // Only remove if it looks like the entire text is wrapped
    // (not just a quote at the beginning of a sentence)
    const inner = trimmed.slice(1, -1);
    // If inner text doesn't contain the same quote type, it's likely wrapping
    const startQuote = trimmed[0];
    const endQuote = trimmed[trimmed.length - 1];
    if (startQuote && endQuote) {
      if (!inner.includes(startQuote) && !inner.includes(endQuote)) {
        return inner;
      }
    }
  }

  return text;
}

/**
 * Remove common LLM prefixes that indicate the model is explaining rather than translating
 */
function removeLLMPrefixes(text: string): string {
  const prefixPatterns: RegExp[] = [
    // English prefixes
    /^(?:Here(?:'s| is) (?:the )?translation:?\s*)/i,
    /^(?:The )?translation(?:\s+is)?:?\s*/i,
    /^(?:Translated text:?\s*)/i,

    // Japanese prefixes
    /^(?:翻訳(?:結果)?(?:は)?[:：]?\s*)/,
    /^(?:以下(?:が|は)翻訳(?:結果)?(?:です)?[:：]?\s*)/,
  ];

  let result = text;
  for (const pattern of prefixPatterns) {
    result = result.replace(pattern, '');
  }

  return result.trim();
}

/**
 * Sanitize streaming chunk
 * Lighter sanitization for streaming to avoid removing incomplete tokens prematurely
 * @param chunk - Raw streaming chunk
 * @param accumulated - Accumulated text so far (for context)
 * @returns Sanitized chunk
 */
export function sanitizeStreamingChunk(chunk: string, _accumulated: string): string {
  // For streaming, we do minimal sanitization on individual chunks
  // Full sanitization happens on the accumulated result
  // This prevents removing partial tokens that might be valid text

  // Only remove complete, obviously invalid patterns
  const safePatterns = [
    /<\|im_start\|>(?:system|user|assistant)/gi,
    /<\|im_end\|>/gi,
    /<\|endoftext\|>/gi,
  ];

  let result = chunk;
  for (const pattern of safePatterns) {
    result = result.replace(pattern, '');
  }

  return result;
}

/**
 * Sanitize accumulated streaming result
 * Called when streaming is complete or at intervals during streaming
 * @param accumulated - Full accumulated text
 * @returns Sanitized accumulated text
 */
export function sanitizeAccumulatedResult(accumulated: string): string {
  return sanitizeTranslationResult(accumulated);
}

