import { Context } from "hono";
import { err, success } from "../utils/response";
import { createPasswordChain } from "../langchain/chains/sequential-chain";
import { createAnalysisChain } from "../langchain/chains/parallel-chain";
import { prisma } from "~/lib/prisma";
import { LangchainStorage } from "../schemas/langchain-storage.schema";
import { getTimeTool } from "../langchain/tools/time-tools";
import { getCountryInfoTool } from "../langchain/tools/country-tools";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { llm } from "../utils/llm";
import { StringOutputParser } from "@langchain/core/output_parsers";

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

    // invoking llm for answer
    const outputPrompt = ChatPromptTemplate.fromTemplate(`
      Create a concise 100-word news report about {country} using this data:
      - Current time: {time}
      - GDP: {gdp} trillion USD
      - GDP Growth: {growth}%
      - Unemployment rate: {unemployment}%
      - CO2 Emissions: {co2} metric tons per capita
      
      Format your response as a brief, dont use any markdown or rich text just keep plain text and professional but light funny news update. Keep it factual and informative.
    `);

    const chain = outputPrompt.pipe(llm).pipe(new StringOutputParser());
    const answer = await chain.invoke({
      country,
      time,
      gdp,
      growth,
      unemployment,
      co2,
    });

    // Store in db
    await storeResult({
      query: `Country information: ${country}`,
      answer,
      type: "agent",
    });

    return c.json(success({ country, answer }));
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

    await storeResult({
      query: `Password processing: ${password}`,
      answer: `Password processing result: ${result.feedback ? result.feedback : result.result}`,

      type: "sequential",
    });

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

    // Store in db
    await storeResult({
      query: `Text analysis: ${text}`,
      answer: `${analysisResult.sentiment}, ${analysisResult.style}`,
      type: "parallel",
    });

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
