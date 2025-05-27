import { ChatBedrockConverse } from '@langchain/aws';
import { z } from 'zod';

export class AgentProvider {
  client: ChatBedrockConverse;

  constructor() {
    this.client = new ChatBedrockConverse({
      // TODO: rename this env variable
      model: process.env.ANTHROPIC_MODEL_ID,
      region: z.string().parse(process.env.AWS_REGION),
      temperature: 0.3,
    });
  }
}
