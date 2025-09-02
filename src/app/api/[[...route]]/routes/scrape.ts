import { Hono } from "hono";
import { handleScrapeRequest } from "../controllers/scrape.controller";

const scrapeRoutes = new Hono();

// Route for handling natural language scraping requests
scrapeRoutes.post("/scrape", handleScrapeRequest);

export default scrapeRoutes;
