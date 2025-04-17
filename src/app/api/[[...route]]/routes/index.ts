import { Hono } from "hono";
import authRoutes from "./auth";
import tokenRoutes from "./token.route";
import langchainRoute from "./langchain";

const indexRoute = new Hono();

// test route
indexRoute.get("/", (c) => {
  return c.json({ message: "working" });
});

// routes
indexRoute.route("/auth", authRoutes);
indexRoute.route("/tokens", tokenRoutes);

indexRoute.route("/langchain", langchainRoute);

export default indexRoute;
