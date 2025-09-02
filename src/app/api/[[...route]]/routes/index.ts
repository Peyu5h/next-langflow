import { Hono } from "hono";
import langchainRoute from "./langchain";
import ragRoute from "./rag";
import sheetsRoutes from "./sheets";
import autoBrowserRoutes from "./autoBrowserRoutes";
import scrapeRoutes from "./scrape";

const indexRoute = new Hono();

// test route
indexRoute.get("/", (c) => {
  return c.json({ message: "working" });
});

// routes
indexRoute.route("/langchain", langchainRoute);
indexRoute.route("/rag", ragRoute);
indexRoute.route("/sheets", sheetsRoutes);
indexRoute.route("/auto-browser", autoBrowserRoutes);
indexRoute.route("/scrape", scrapeRoutes);
export default indexRoute;
