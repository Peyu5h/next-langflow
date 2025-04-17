import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth";
import { success, err } from "../utils/response";
import { sign } from "jsonwebtoken";

const tokenRoutes = new Hono();

tokenRoutes.post("/jwt", authMiddleware, async (c) => {
  try {
    console.log("JWT token generation started");
    const user = (c as any).get("user");
    console.log("User from context:", user.id);

    const { name = "API Testing Token" } = await c.req.json();
    console.log("Token name:", name);

    const secret = process.env.BETTER_AUTH_SECRET || "your-secret-key";

    // Generate the token
    const token = sign(
      {
        sub: user.id,
        name: user.name,
        email: user.email,
        tokenType: "api",
        tokenName: name,
      },
      secret,
      { expiresIn: "30d" },
    );

    console.log("Token generated successfully");

    return c.json(
      success({
        token,
        message: "Store this token safely. It won't be shown again.",
      }),
    );
  } catch (error) {
    console.error("Token generation error:", error);
    return c.json(err("Failed to generate token"), 500);
  }
});

export default tokenRoutes;
