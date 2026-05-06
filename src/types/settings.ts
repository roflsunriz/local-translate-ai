/**
 * Settings and configuration types
 */

export type SupportedLanguage =
  | 'auto'
  | 'Japanese'
  | 'English'
  | 'Chinese'
  | 'Korean'
  | 'Spanish'
  | 'Portuguese'
  | 'Russian'
  | 'Hindi'
  | 'Arabic'
  | 'French'
  | 'Bengali'
  | 'Indonesian';

export type UILanguage =
  | 'auto'
  | 'ja'
  | 'en'
  | 'zh'
  | 'ko'
  | 'es'
  | 'pt'
  | 'ru'
  | 'hi'
  | 'ar'
  | 'fr'
  | 'bn'
  | 'id';

export type ThemeMode = 'auto' | 'light' | 'dark';
export type ApiType = 'openai' | 'anthropic';

export interface TranslationProfile {
  id: string;
  name: string;
  apiType: ApiType;
  apiEndpoint: string;
  apiKey: string;
  model: string;
  timeout: number;
  sourceLanguage: SupportedLanguage;
  targetLanguage: SupportedLanguage;
  systemPrompt: string;
  userPromptTemplate: string;
}

export interface KeyboardShortcuts {
  translateSelection: string;
  toggleSidebar: string;
}

export interface ExclusionPattern {
  id: string;
  name: string;
  pattern: string;
  enabled: boolean;
}

export interface CurrencyConversionSettings {
  enabled: boolean;
  usdToJpyRate: number;
}

export interface ParamConversionSettings {
  enabled: boolean;
}

export interface Settings {
  // UI Settings
  uiLanguage: UILanguage;
  themeMode: ThemeMode;

  // Profile Settings
  activeProfileId: string;
  profiles: TranslationProfile[];

  // Feature Settings
  currencyConversion: CurrencyConversionSettings;
  paramConversion: ParamConversionSettings;
  exclusionPatterns: ExclusionPattern[];
  keyboardShortcuts: KeyboardShortcuts;

  // Popup Settings
  popupCloseOnOutsideAction: boolean;

  // History Settings
  historyMaxItems: number;
  historyEnabled: boolean;

  // Retry Settings
  retryCount: number;
  retryInterval: number;

  // Streaming
  streamingEnabled: boolean;

  // Google Translate
  useGoogleTranslate: boolean;
}

export const DEFAULT_SYSTEM_PROMPT =
`You are an advanced translation engine with deep expertise in technology. Your role is to accurately translate text into {{target_language}} while preserving the original formatting, technical terminology, and abbreviations. Do not add any explanations or notes to the translation output.
---
When translating into Japanese, do not end sentences with polite-form expressions such as "ます", "です", or "ました". Always use plain-form expressions such as "だ", "である", or "した". Examples:
Source example 1: Running is good constitution to your health.
Translation example 1: ランニングは健康に良い体質を作る。
Source example 2: Here is an apple on the table. It's smell is freshly, sweet, and ready to eat.
Translation example 2: テーブルの上にリンゴが置いてある。その香りは新鮮で甘く、食べるのに丁度よい。
Source example 3: No need to mention, we have to hurry as possible as we can.
Translation example 3: 言うまでもなく、私たちは可能な限り急ぐ必要がある。`;

export const DEFAULT_USER_PROMPT_TEMPLATE = `<|plamo:op|>dataset
translation
<|plamo:op|>input lang={{source_language}}
{{input_text}}
<|plamo:op|>output lang={{target_language}}`;

export const DEFAULT_PROFILE: TranslationProfile = {
  id: 'default-plamo2-llama-cpp',
  name: 'Default-PLaMo2-Llama-cpp',
  apiType: 'openai',
  apiEndpoint: 'http://localhost:3002/v1/chat/completions',
  apiKey: 'test',
  model: 'plamo-2-translate-gguf',
  timeout: 600,
  sourceLanguage: 'auto',
  targetLanguage: 'Japanese',
  systemPrompt: DEFAULT_SYSTEM_PROMPT,
  userPromptTemplate: DEFAULT_USER_PROMPT_TEMPLATE,
};

export const DEFAULT_EXCLUSION_PATTERNS: ExclusionPattern[] = [
  {
    id: 'code-blocks',
    name: 'Code Blocks',
    pattern: '```[\\s\\S]*?```|`[^`]+`',
    enabled: true,
  },
  {
    id: 'urls',
    name: 'URLs',
    pattern: 'https?://[\\S]+',
    enabled: true,
  },
  {
    id: 'math-formulas',
    name: 'Math Formulas',
    pattern: '\\$\\$[\\s\\S]*?\\$\\$|\\$[^$]+\\$',
    enabled: true,
  },
  {
    id: 'email-addresses',
    name: 'Email Addresses',
    pattern: '[\\w.-]+@[\\w.-]+\\.[a-zA-Z]{2,}',
    enabled: true,
  },
];

export const DEFAULT_SETTINGS: Settings = {
  uiLanguage: 'auto',
  themeMode: 'auto',
  activeProfileId: DEFAULT_PROFILE.id,
  profiles: [DEFAULT_PROFILE],
  currencyConversion: {
    enabled: false,
    usdToJpyRate: 150,
  },
  paramConversion: {
    enabled: false,
  },
  exclusionPatterns: DEFAULT_EXCLUSION_PATTERNS,
  keyboardShortcuts: {
    translateSelection: 'Alt+W',
    toggleSidebar: 'Alt+Q',
  },
  popupCloseOnOutsideAction: false,
  historyMaxItems: 100,
  historyEnabled: true,
  retryCount: 3,
  retryInterval: 1000,
  streamingEnabled: true,
  useGoogleTranslate: false,
};

