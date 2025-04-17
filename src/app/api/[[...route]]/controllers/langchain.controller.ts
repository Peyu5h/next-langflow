import { Context } from "hono";
import { err, success } from "../utils/response";
import { createTimeAgent } from "../langchain/agents/time-agent";
import { createPasswordChain } from "../langchain/chains/sequential-chain";
import { createAnalysisChain } from "../langchain/chains/parallel-chain";
import { prisma } from "~/lib/prisma";
import { LangchainStorage } from "../schemas/langchain-storage.schema";

// Agent
export const processAgentQuery = async (c: Context) => {
  try {
    const { query } = await c.req.json();

    if (!query) {
      return c.json(err("Query is required"), 400);
    }

    const agentExecutor = await createTimeAgent();
    const result = await agentExecutor.invoke({
      input: query,
    });

    let answer;
    if (result.output === "Agent stopped due to max iterations.") {
      if (result.intermediateSteps && result.intermediateSteps.length > 0) {
        const lastStep =
          result.intermediateSteps[result.intermediateSteps.length - 1];
        answer = lastStep.observation;
      } else {
        answer = "Could not get a proper answer.";
      }
    } else {
      answer = result.output;
    }

    // Storing in db
    await storeLangchainResult({
      query,
      answer,
      type: "agent",
    });

    return c.json(success({ query, answer, steps: result.intermediateSteps }));
  } catch (error: any) {
    return c.json(err(`Failed to process query: ${error.message}`), 500);
  }
};

// Sequential chain
export const processPasswordChain = async (c: Context) => {
  try {
    const { password } = await c.req.json();

    if (!password) {
      return c.json(err("Password is required"), 400);
    }

    const passwordChain = createPasswordChain();
    const result = await passwordChain({ password });

    return c.json(success(result));
  } catch (error: any) {
    return c.json(err(`Failed to process password: ${error.message}`), 500);
  }
};

// Parallel chain
export const processTextAnalysis = async (c: Context) => {
  try {
    const { text } = await c.req.json();

    if (!text) {
      return c.json(err("Text is required"), 400);
    }

    const analysisChain = createAnalysisChain();
    const result = await analysisChain.invoke({ text });

    const analysisResult = {
      text: text,
      sentiment: result.sentiment,
      style: result.style,
    };

    return c.json(success(analysisResult));
  } catch (error: any) {
    return c.json(err(`Failed to analyze text: ${error.message}`), 500);
  }
};

// ===================================================

export const storeLangchainResult = async (data: LangchainStorage) => {
  try {
    const result = await prisma.tempLangchainStorage.create({
      data,
    });
    return result;
  } catch (error: any) {
    console.error(`Failed to store langchain result: ${error.message}`);
    throw error;
  }
};

export const getLangchainResults = async (c: Context) => {
  try {
    const results = await prisma.tempLangchainStorage.findMany({
      orderBy: {
        timestamp: "desc",
      },
      take: 20,
    });
    return c.json(success(results));
  } catch (error: any) {
    return c.json(
      err(`Failed to fetch langchain results: ${error.message}`),
      500,
    );
  }
};
