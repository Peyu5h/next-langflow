import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { RunnableMap } from "@langchain/core/runnables";
import { llm } from "../../utils/llm";

const sentimentPrompt = ChatPromptTemplate.fromTemplate(`
Analyze the sentiment of this text. 
Text: {text}
Respond with only: POSITIVE, NEGATIVE, or NEUTRAL
`);

const stylePrompt = ChatPromptTemplate.fromTemplate(`
Analyze the writing style of this text.
Text: {text}
Respond with only: FORMAL, CASUAL, or TECHNICAL
`);

export const createAnalysisChain = () => {
  const sentimentAnalysis = sentimentPrompt
    .pipe(llm)
    .pipe(new StringOutputParser());

  const styleAnalysis = stylePrompt.pipe(llm).pipe(new StringOutputParser());

  return RunnableMap.from({
    sentiment: sentimentAnalysis,
    style: styleAnalysis,
    originalText: (input) => input,
  });
};
