import OpenAI from 'openai';
import { env } from '../../../config/env.js';
import type { ApplicationSnapshot } from '../../../workflow/types.js';
import { buildAssessmentPrompt } from '../prompts/assessmentPrompt.js';
import { AiAssessmentResultSchema, type AiAssessmentResult, type AiProvider } from '../types.js';

export class OpenAiProvider implements AiProvider {
  readonly name = 'openai';

  async assess(
    application: ApplicationSnapshot,
    stage: ApplicationSnapshot['stage']
  ): Promise<AiAssessmentResult> {
    if (!env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
    const { system, user } = buildAssessmentPrompt(application, stage);

    const response = await client.chat.completions.create({
      model: env.OPENAI_MODEL,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    });

    const text = response.choices[0]?.message?.content ?? '{}';
    return AiAssessmentResultSchema.parse(JSON.parse(text));
  }
}
