import { Stagehand, Page, BrowserContext } from "@browserbasehq/stagehand";
import { z } from "zod";
import { Context } from "hono";
import StagehandConfig from "../autoBrowser/stagehand.config";

async function main({
  page,
  context,
  stagehand,
  //   url,
}: {
  page: Page; // Playwright Page with act, extract, and observe methods
  context: BrowserContext; // Playwright BrowserContext
  stagehand: Stagehand; // Stagehand instance
}) {
  await page.goto(
    "https://unstop.com/hackathons?oppstatus=open&domain=2&course=6&specialization=Computer%20Science&usertype=students&passingOutYear=2026&quickApply=true",
  );

  await page.setViewportSize({ width: 375, height: 667 });

  const startTime = Date.now();
  const scrollDuration = 10000;

  while (Date.now() - startTime < scrollDuration) {
    await page.evaluate(() => {
      window.scrollBy(0, 100);
    });
    await page.waitForTimeout(100);
  }

  const { content } = await page.extract({
    instruction: "extract all visible content from the page",
    schema: z.object({
      content: z.string(),
    }),
    useTextExtract: true,
  });

  stagehand.log({
    category: "unstop-scraper",
    message: "Extracted content from Unstop hackathons page",
    auxiliary: {
      content: {
        value: content,
        type: "string",
      },
    },
  });
}

export const testBrowser = async (c: Context) => {
  try {
    const stagehand = new Stagehand({
      ...StagehandConfig,
    });
    // await stagehand.init();
    // const page = stagehand.page;
    // const context = stagehand.context;
    // await main({
    //   page,
    //   context,
    //   stagehand,
    //   //   url,
    // });
    // await stagehand.close();
    return c.json({
      message: "Stagehand initialized (main call commented out)",
    });
  } catch (error) {
    console.error(error);
    return c.json({ error: "Failed to test browser" }, 500);
  }
};
