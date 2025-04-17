import { Context } from "hono";
import { err, success } from "../utils/response";
import { createTimeAgent } from "../langchain/agents/time-agent";
import { createPasswordChain } from "../langchain/chains/sequential-chain";
import { createAnalysisChain } from "../langchain/chains/parallel-chain";
import { prisma } from "~/lib/prisma";
import { LangchainStorage } from "../schemas/langchain-storage.schema";
import { getTimeTool } from "../langchain/tools/time-tools";
import { getCountryInfoTool } from "../langchain/tools/country-tools";

// Agent
export const processAgentQuery = async (c: Context) => {
  try {
    const { query, country } = await c.req.json();

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
    await storeResult({
      query,
      answer,
      type: "agent",
    });

    return c.json(success({ query, answer, steps: result.intermediateSteps }));
  } catch (error: any) {
    return c.json(err(`Failed to process query: ${error.message}`), 500);
  }
};

// Country Agent
export const processCountryInfo = async (c: Context) => {
  try {
    const { country } = await c.req.json();

    if (!country) {
      return c.json(err("Country name is required"), 400);
    }

    // running tools in parallel
    const [timeResult, countryResult] = await Promise.all([
      getTimeTool.func(country),
      getCountryInfoTool.func(country),
    ]);

    const time =
      timeResult.match(/Current time in .+?: (\d+:\d+)/)?.[1] || "unavailable";
    const gdp =
      countryResult.match(/GDP: ([\d\.]+) trillion USD/)?.[1] || "N/A";
    const growth = countryResult.match(/GDP Growth: ([\d\.]+)%/)?.[1] || "N/A";
    const unemployment =
      countryResult.match(/Unemployment: ([\d\.]+)%/)?.[1] || "N/A";
    const co2 =
      countryResult.match(/CO2 Emissions: ([\d\.]+) metric tons/)?.[1] || "N/A";

    const answer = `Breaking news from ${country}! It's currently ${time}. The economy boasts a GDP of ${gdp} trillion USD with ${growth}% growth. Unemployment sits at ${unemployment}%. Environment watch: CO2 emissions are at ${co2} metric tons. That's all for now, back to you in the studio!`;

    // Store in db
    await storeResult({
      query: `Country information: ${country}`,
      answer,
      type: "agent",
    });

    // Create mock steps for consistent UI display
    const steps = [
      {
        action: { tool: "get_time_for_timezone", toolInput: country },
        observation: timeResult,
      },
      {
        action: { tool: "get_country_info", toolInput: country },
        observation: countryResult,
      },
    ];

    return c.json(success({ country, answer, steps }));
  } catch (error: any) {
    //store the error in db
    try {
      await storeResult({
        query: `Error for country info: ${error.message}`,
        answer: `Error processing country information. Please try again.`,
        type: "agent",
      });
    } catch (dbError) {
      console.error("Failed to log error to DB:", dbError);
    }

    return c.json(err(`Failed to process country info: ${error.message}`), 500);
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

export const getLangchainResults = async (c: Context) => {
  try {
    const results = await prisma.tempLangchainStorage.findMany({
      orderBy: {
        timestamp: "desc",
      },
      take: 20,
    });

    // Sort again in case the database sort wasn't effective
    const sortedResults = [...results].sort((a, b) => {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

    return c.json(success(sortedResults));
  } catch (error: any) {
    return c.json(
      err(`Failed to fetch langchain results: ${error.message}`),
      500,
    );
  }
};

export async function storeResult(data: LangchainStorage): Promise<void> {
  try {
    await prisma.tempLangchainStorage.create({
      data,
    });
  } catch (error: any) {
    console.error(`Failed to store result: ${error.message}`);
  }
}
