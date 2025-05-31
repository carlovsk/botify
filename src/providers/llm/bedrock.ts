import { ChatBedrockConverse } from '@langchain/aws';
import { z } from 'zod';

enum Models {
  Claude35Haiku = 'us.anthropic.claude-3-5-haiku-20241022-v1:0',
  Claude3Haiku = 'us.anthropic.claude-3-haiku-20240307-v1:0',
  Llama4Scout17B = 'us.meta.llama4-scout-17b-instruct-v1:0',
}

export class LlmProvider {
  client: ChatBedrockConverse;

  constructor() {
    this.client = new ChatBedrockConverse({
      model: Models.Claude35Haiku,
      region: z.string().parse(process.env.AWS_REGION),
      temperature: 0.3,
    });
  }
}
