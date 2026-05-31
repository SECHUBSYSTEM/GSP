import { env } from '../../config/env.js';
import { GeminiAiProvider } from './providers/geminiProvider.js';
import { MockAiProvider } from './providers/mockProvider.js';
import { OpenAiProvider } from './providers/openaiProvider.js';
import type { AiProvider } from './types.js';

export function createAiProvider(providerName = env.AI_PROVIDER): AiProvider {
  switch (providerName) {
    case 'gemini':
      return new GeminiAiProvider();
    case 'openai':
      return new OpenAiProvider();
    case 'mock':
    default:
      return new MockAiProvider();
  }
}
