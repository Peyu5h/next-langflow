import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { llm } from "../../utils/llm";

const passwordCheckPrompt = ChatPromptTemplate.fromTemplate(`
Check if this password meets basic requirements:
Password: {password}
Requirements:
- At least 8 characters
- Contains numbers
- Contains special characters
Respond with only "PASS" or "FAIL"
`);

const feedbackPrompt = ChatPromptTemplate.fromTemplate(`
Analyze why this password failed and provide feedback:
Password: {password}

Provide two short lines:
1. Why the password failed
2. How to improve it
Keep it brief and clear.
`);

export const createPasswordChain = () => {
  const passwordValidation = passwordCheckPrompt
    .pipe(llm)
    .pipe(new StringOutputParser());

  const feedbackGeneration = feedbackPrompt
    .pipe(llm)
    .pipe(new StringOutputParser());

  return async (input: { password: string }) => {
    const checkResult = await passwordValidation.invoke({
      password: input.password,
    });

    if (checkResult.trim() === "FAIL") {
      const feedback = await feedbackGeneration.invoke({
        password: input.password,
      });
      return {
        result: checkResult.trim(),
        feedback,
        password: input.password,
      };
    }

    return {
      result: checkResult.trim(),
      password: input.password,
    };
  };
};
