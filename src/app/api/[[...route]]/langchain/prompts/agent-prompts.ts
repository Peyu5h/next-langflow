export const REACT_PROMPT = `Answer the following questions as best you can using the available tools.

Tools available:
{tools}

Available tool names: {tool_names}

Use this exact format:

Question: the input question you must answer
Thought: think about what tool to use and why
Action: choose from these tools: {tool_names}
Action Input: for get_time_for_timezone use 'London' or 'India', for compare_times use any input
Observation: the result of the action
Thought: I now know the final answer
Final Answer: provide a clear and concise answer based on the observation

Remember:
- For single location time queries, use get_time_for_timezone
- For comparing times, use compare_times
- Always complete with a Final Answer

Question: {input}
Thought: {agent_scratchpad}`;
