import { Hono } from "hono";
import {
  processCountryInfo,
  processPasswordChain,
  processTextAnalysis,
  getLangchainResults,
} from "../controllers/langchain.controller";

const langchainRoute = new Hono();

//chaining
langchainRoute.post("/sequential", processPasswordChain);
langchainRoute.post("/parallel", processTextAnalysis);

//country agent
langchainRoute.post("/country", processCountryInfo);

// results
langchainRoute.get("/results", getLangchainResults);

export default langchainRoute;
