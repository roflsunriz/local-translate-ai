/**
 * OpenAI-compatible API types
 */

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
  stop?: string[];
}

export interface ChatCompletionChoice {
  index: number;
  message: ChatMessage;
  finish_reason: 'stop' | 'length' | 'content_filter' | null;
}

export interface ChatCompletionResponse {
  id: string;
  object: 'chat.completion';
  created: number;
  model: string;
  choices: ChatCompletionChoice[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface ChatCompletionChunk {
  id: string;
  object: 'chat.completion.chunk';
  created: number;
  model: string;
  choices: {
    index: number;
    delta: Partial<ChatMessage>;
    finish_reason: 'stop' | 'length' | 'content_filter' | null;
  }[];
}

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

/**
 * Anthropic API types
 */
export interface AnthropicMessageContentBlock {
  type: 'text';
  text: string;
}

export interface AnthropicMessageRequest {
  model: string;
  system?: string;
  messages: {
    role: 'user' | 'assistant';
    content: string | AnthropicMessageContentBlock[];
  }[];
  max_tokens: number;
  temperature?: number;
  stream?: boolean;
  stop_sequences?: string[];
}

export interface AnthropicUsage {
  input_tokens: number;
  output_tokens: number;
}

export interface AnthropicMessageResponse {
  id: string;
  type: 'message';
  role: 'assistant';
  model: string;
  content: AnthropicMessageContentBlock[];
  stop_reason: 'end_turn' | 'max_tokens' | 'stop_sequence' | null;
  stop_sequence?: string | null;
  usage?: AnthropicUsage;
}

export type AnthropicStreamEventType =
  | 'message_start'
  | 'message_delta'
  | 'message_stop'
  | 'content_block_start'
  | 'content_block_delta'
  | 'content_block_stop'
  | 'error';

export interface AnthropicStreamChunk {
  type: AnthropicStreamEventType;
  delta?: { text?: string };
  content_block?: AnthropicMessageContentBlock;
  message?: AnthropicMessageResponse;
  error?: {
    type: string;
    message: string;
  };
}

export type ApiResult<T> =
  | { success: true; data: T }
  | { success: false; error: ApiError };

