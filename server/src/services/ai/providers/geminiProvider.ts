import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../../../config/env.js';
import type { ApplicationSnapshot } from '../../../workflow/types.js';
import { buildAssessmentPrompt } from '../prompts/assessmentPrompt.js';
import { AiAssessmentResultSchema, type AiAssessmentResult, type AiProvider } from '../types.js';

export class GeminiAiProvider implements AiProvider {
  readonly name = 'gemini';

  async assess(
    application: ApplicationSnapshot,
    stage: ApplicationSnapshot['stage']
  ): Promise<AiAssessmentResult> {
    if (!env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: env.GEMINI_MODEL,
      generationConfig: { temperature: 0.2, responseMimeType: 'application/json' },
    });

    const { system, user } = buildAssessmentPrompt(application, stage);
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: `${system}\n\n${user}` }] }],
    });

    const text = result.response.text();
    const parsed = AiAssessmentResultSchema.parse(JSON.parse(text));
    return parsed;
  }
}
