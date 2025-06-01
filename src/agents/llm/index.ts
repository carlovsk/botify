import { ChatBedrockConverse } from '@langchain/aws';
import { DynamicStructuredTool, DynamicTool } from 'langchain/tools';
import { z } from 'zod';

enum BedRockModels {
  Claude35Haiku = 'us.anthropic.claude-3-5-haiku-20241022-v1:0',
  Claude3Haiku = 'us.anthropic.claude-3-haiku-20240307-v1:0',
  Llama4Scout17B = 'us.meta.llama4-scout-17b-instruct-v1:0',
  NovaLite = 'amazon.nova-lite-v1:0',
}

export class BedrockProvider {
  private readonly modelId = BedRockModels.Claude3Haiku;
  private readonly region = z.string().parse(process.env.AWS_REGION);

  constructor(private tools: (DynamicTool | DynamicStructuredTool)[]) {}

  public getClient() {
    return new ChatBedrockConverse({
      model: this.modelId,
      region: this.region,
    }).bindTools(this.tools);
  }
}
