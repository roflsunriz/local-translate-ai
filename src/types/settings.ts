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
}

export const DEFAULT_SYSTEM_PROMPT =
`あなたはテクノロジー分野に精通した高度な翻訳エンジンである。あなたの役割は、原文の書式、専門用語、略語を正確に保持しつつ、テキストを{{target_language}}に正確に翻訳することである。翻訳結果にはいかなる説明や注釈も付加してはならない。
---
翻訳結果の文末の敬体表現「～ます。～です。～ました。」を禁止する。如何なる時も常体表現「～だ。～である。～した。」で翻訳せよ。具体例は次の通り。
原文例1: Running is good constitution to your health.
翻訳文例1: ランニングは健康に良い体質を作る。
原文例2: Here is an apple on the table. It's smell is freshly, sweet, and ready to eat. 
翻訳文例2: テーブルの上にリンゴが置いてある。その香りは新鮮で甘く、食べるのに丁度よい。
原文例3: No need to mention, we have to hurry as possible as we can.
翻訳文例3: 言うまでもなく、私たちは可能な限り急ぐ必要がある。`;

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
};

