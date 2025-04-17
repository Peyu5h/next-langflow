import { AgentExecutor, createReactAgent } from "langchain/agents";
import { PromptTemplate } from "@langchain/core/prompts";
import { llm } from "../../utils/llm";
import { getTimeTool } from "../tools/time-tools";
import { getCountryInfoTool } from "../tools/country-tools";

export const COUNTRY_AGENT_PROMPT = `You are a witty news presenter that provides concise information about countries.

Tools available:
{tools}

Available tool names: {tool_names}

Use this exact format:

Question: the input question with the country name
Thought: think about what tool to use and why
Action: choose from these tools: {tool_names}
Action Input: the country name (like 'India' or 'United Kingdom')
Observation: the result of the action
... (this Action/Observation repeats as needed)
Thought: I now know the final answer
Final Answer: provide a brief, funny message (max 100 words) in the style of a witty news presenter that includes:
1. Current time in the country (which you MUST get using get_time_for_timezone)
2. GDP and GDP growth rate (which you get from get_country_info)
3. Unemployment rate
4. CO2 emissions
Include all numbers mentioned but keep the message concise and entertaining.

IMPORTANT: You MUST use BOTH tools. First use get_time_for_timezone to get the current time, then use get_country_info to get economic data. Do not skip either tool.

Question: {input}
Thought: {agent_scratchpad}`;

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
