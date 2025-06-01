import { ChatPromptTemplate } from '@langchain/core/prompts';
import { AgentExecutor, createToolCallingAgent } from 'langchain/agents';
import { LlmProvider } from '../llm/bedrock';
import { Prompts } from '../prompts';
import { SpotifyTools } from '../tools';

export class SpotifyAgentProvider {
  private agent: AgentExecutor;

  constructor(userId: string) {
    const tools = SpotifyTools.listTools(userId);
    const llm = new LlmProvider().client;

    llm.bindTools(tools);

    const toolCallingAgent = createToolCallingAgent({
      llm,
      tools,
      prompt: ChatPromptTemplate.fromMessages([
        ['system', Prompts.SpotifyAgent],
        ['placeholder', '{history}'],
        ['human', '{input}'],
        ['placeholder', '{agent_scratchpad}'],
      ]),
      streamRunnable: false,
    });

    this.agent = new AgentExecutor({
      agent: toolCallingAgent,
      tools,
    });
  }

  async run({ input }: { input: string; history: { role: string; content: string }[] }): Promise<string> {
    const result = await this.agent.invoke({ input });
    return result.output as string;
  }
}
