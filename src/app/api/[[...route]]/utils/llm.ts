import { ChatMistralAI } from "@langchain/mistralai";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatOpenAI } from "@langchain/openai";

export const mistralLLM = new ChatMistralAI({
  modelName: "mistral-large-latest",
  temperature: 0,
});

export const geminiLLM = new ChatGoogleGenerativeAI({
  model: "gemini-1.5-flash",
  temperature: 0,
});

export const openAILLM = new ChatOpenAI({
  model: "gpt-4o",
  temperature: 0,
});

// Default LLM to use
export const llm = mistralLLM;
