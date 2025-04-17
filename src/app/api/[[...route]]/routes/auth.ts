import { Hono } from "hono";
import { auth } from "~/lib/auth";
import { err } from "../utils/response";

const authRoutes = new Hono();

authRoutes.on(["GET", "POST", "DELETE", "OPTIONS"], "/**", async (c) => {
  try {
    return await auth.handler(c.req.raw);
  } catch (error) {
    console.error("Auth handler error:", error);
    return c.json(err("Authentication error"), 500);
  }
});

export default authRoutes;