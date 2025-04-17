import { AgentExecutor, createReactAgent } from "langchain/agents";
import { PromptTemplate } from "@langchain/core/prompts";
import { llm } from "../../utils/llm";
import { getTimeTool } from "../tools/time-tools";
import { getCountryInfoTool } from "../tools/country-tools";
import { COUNTRY_AGENT_PROMPT } from "../prompts/country-agent-prompts";

export const createCountryAgent = async () => {
  const tools = [getTimeTool, getCountryInfoTool];
  const prompt = PromptTemplate.fromTemplate(COUNTRY_AGENT_PROMPT);

  const agent = await createReactAgent({
    llm,
    tools,
    prompt,
  });

  return AgentExecutor.fromAgentAndTools({
    agent,
    tools,
    verbose: true, // logs for debugging
    maxIterations: 5,
    returnIntermediateSteps: true,
    handleParsingErrors: true,
    earlyStoppingMethod: "generate", // Continue generating if stopped early
  });
};
