import { ChatBedrockConverse } from '@langchain/aws';
import { z } from 'zod';

export class LlmProvider {
  client: ChatBedrockConverse;

  constructor() {
    this.client = new ChatBedrockConverse({
      model: process.env.AWS_BEDROCK_MODEL_ID,
      region: z.string().parse(process.env.AWS_REGION),
      temperature: 0.3,
    });
  }
}
