import { BedrockProvider } from '@/agents/llm';
import { Prompts } from '@/agents/prompts';
import { SpotifyTools } from '@/agents/tools';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { AgentExecutor, createToolCallingAgent } from 'langchain/agents';

export class SpotifyAgentProvider {
  private agent: AgentExecutor;

  constructor(userId: string) {
    const tools = SpotifyTools.listTools(userId);
    const llm = new BedrockProvider(tools).getClient();

    const agent = createToolCallingAgent({
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
      agent,
      tools,
    });
  }

  async run({ input, history }: { input: string; history: any[] }) {
    const result = await this.agent.invoke({ input, history });
    return result.output as string;
  }
}
