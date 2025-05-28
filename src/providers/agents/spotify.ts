import { ChatPromptTemplate } from '@langchain/core/prompts';
import { AgentExecutor, createToolCallingAgent } from 'langchain/agents';
import { LlmProvider } from '../llm/bedrock';
import { SpotifyTools } from '../tools';

export class SpotifyAgentProvider {
  private agent: AgentExecutor;

  constructor() {
    const tools = SpotifyTools.listTools();
    const llm = new LlmProvider().client;

    llm.bindTools(tools);

    const toolCallingAgent = createToolCallingAgent({
      llm,
      tools,
      prompt: ChatPromptTemplate.fromMessages([
        [
          'system',
          'You are a Spotify agent. You can control playback, search for tracks, and management of playlists. Do not answer questions that are not related to Spotify.',
        ],
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

  async run({ input, history }: { input: string; history: { role: string; content: string }[] }): Promise<string> {
    const result = await this.agent.invoke({ input, history });
    return result.output as string;
  }
}
