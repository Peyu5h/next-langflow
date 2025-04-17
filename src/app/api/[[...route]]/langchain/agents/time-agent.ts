import { AgentExecutor, createReactAgent } from "langchain/agents";
import { PromptTemplate } from "@langchain/core/prompts";
import { llm } from "../../utils/llm";
import { getTimeTool } from "../tools/time-tools";
import { REACT_PROMPT } from "../prompts/agent-prompts";

export const createTimeAgent = async () => {
  const tools = [getTimeTool];
  const prompt = PromptTemplate.fromTemplate(REACT_PROMPT);

  const agent = await createReactAgent({
    llm,
    tools,
    prompt,
  });

  return AgentExecutor.fromAgentAndTools({
    agent,
    tools,
    verbose: false,
    maxIterations: 3,
    returnIntermediateSteps: true,
  });
};
