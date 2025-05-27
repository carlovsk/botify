import { ChatPromptTemplate } from '@langchain/core/prompts';
import { AgentExecutor, createToolCallingAgent } from 'langchain/agents';
import { AgentProvider } from '.';
import { SpotifyTools } from '../tools';

export class SpotifyAgentProvider {
  private agent: AgentExecutor;

  constructor() {
    const tools = SpotifyTools.listTools();
    const llm = new AgentProvider().client;

    llm.bindTools(tools);

    const toolCallingAgent = createToolCallingAgent({
      llm,
      tools,
      prompt: ChatPromptTemplate.fromMessages([
        [
          'system',
          'You are a Spotify agent. You can control playback, search for tracks, and management of playlists. Do not answer questions that are not related to Spotify.',
        ],
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

  async run(input: string): Promise<string> {
    const result = await this.agent.invoke({ input, role: 'user' });
    return result.output as string;
  }
}
