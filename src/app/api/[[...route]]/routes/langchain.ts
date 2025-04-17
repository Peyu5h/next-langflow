import { Hono } from "hono";
import {
  processAgentQuery,
  processPasswordChain,
  processTextAnalysis,
  getLangchainResults,
} from "../controllers/langchain.controller";

const langchainRoute = new Hono();

//chaining
langchainRoute.post("/sequential", processPasswordChain);
langchainRoute.post("/parallel", processTextAnalysis);

//agent
langchainRoute.post("/agent", processAgentQuery);

// results
langchainRoute.get("/results", getLangchainResults);

export default langchainRoute;
