import { Context } from "hono";
import { success, err } from "../utils/response";
import { llm } from "../utils/llm";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import * as cheerio from "cheerio";

interface ScrapeParameters {
  url?: string;
  selectors?: string[];
  extractionDescription?: string;
}

export const handleScrapeRequest = async (c: Context) => {
  try {
    const { query } = await c.req.json();

    if (!query || typeof query !== "string") {
      return c.json(
        err(
          "Invalid query provided. Please provide a string query like 'Scrape headlines from example.com'",
        ),
        400,
      );
    }

    // 1. Use LLM to parse the query
    const promptMessages = [
      new SystemMessage(
        "You are an AI assistant that understands web scraping requests. " +
          "Analyze the user's natural language query and extract the target URL and CSS selectors for the desired data. " +
          "Identify the main elements the user wants (e.g., titles, links, paragraphs). " +
          "Respond ONLY with a JSON object containing 'url' and 'selectors' (an array of CSS selectors). " +
          'If the URL is missing, return an error in the JSON: { "error": "URL is missing" }. ' +
          'If selectors cannot be determined, provide common selectors like [\'h1\', \'h2\', \'p\', \'a\']. Example: { "url": "https://example.com", "selectors": ["h1", ".headline"] }',
      ),
      new HumanMessage(
        `Parse the following user query for scraping: "${query}"`,
      ),
    ];

    const llmResponse = await llm.invoke(promptMessages);
    let parsedParams: ScrapeParameters & { error?: string };

    try {
      // Extract JSON from the response, handling potential markdown backticks
      const jsonMatch = llmResponse.content.toString().match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[0] : "{}";
      parsedParams = JSON.parse(jsonString);

      if (parsedParams.error) {
        return c.json(err(`LLM Error: ${parsedParams.error}`), 400);
      }

      if (!parsedParams.url || !URL.canParse(parsedParams.url)) {
        return c.json(
          err("Could not extract a valid URL from your query."),
          400,
        );
      }
      if (!parsedParams.selectors || parsedParams.selectors.length === 0) {
        // Provide default selectors if LLM fails to find specific ones
        parsedParams.selectors = ["h1", "h2", "h3", "p", "a"];
      }
    } catch (error) {
      console.error("Error parsing LLM response for scraping:", error);
      return c.json(
        err("Failed to understand the scraping request from the LLM response."),
        500,
      );
    }

    // 2. Fetch the HTML content
    let htmlContent = "";
    try {
      const response = await fetch(parsedParams.url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      htmlContent = await response.text();
    } catch (fetchError: any) {
      console.error(`Error fetching URL ${parsedParams.url}:`, fetchError);
      return c.json(err(`Failed to fetch the URL: ${fetchError.message}`), 500);
    }

    // 3. Parse HTML with Cheerio and extract data
    const $ = cheerio.load(htmlContent);
    const results: { [selector: string]: string[] } = {};
    let totalResults = 0;

    parsedParams.selectors.forEach((selector) => {
      results[selector] = [];
      $(selector).each((i: number, element: cheerio.Element) => {
        // Extract text, prioritizing meaningful content
        const text = $(element).text()?.trim();
        // Optionally extract href for links
        const href = selector === "a" ? $(element).attr("href") : null;

        let content = text;
        if (href) {
          content = `${text} (${href})`;
        }

        if (content) {
          results[selector].push(content);
          totalResults++;
        }
      });
      // If a selector yielded no results, remove it from the final output
      if (results[selector].length === 0) {
        delete results[selector];
      }
    });

    if (totalResults === 0) {
      return c.json(
        success({
          message: `Successfully fetched ${parsedParams.url}, but found no content matching the selectors: ${parsedParams.selectors.join(", ")}.`,
          url: parsedParams.url,
          data: {},
        }),
      );
    }

    return c.json(
      success({
        message: `Successfully scraped data from ${parsedParams.url}.`,
        url: parsedParams.url,
        data: results,
      }),
    );
  } catch (error: any) {
    console.error("Error handling scrape request:", error);
    return c.json(err(`An unexpected error occurred: ${error.message}`), 500);
  }
};
