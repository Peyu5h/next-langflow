import { createGlobalState } from "./index";

export const useLLM = createGlobalState("llm", { value: "geminiLLM" });
