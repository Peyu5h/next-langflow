import { createMiddleware } from "hono/factory";
import { auth } from "~/lib/auth";
import { err } from "../utils/response";
import { verify } from "jsonwebtoken";
import { prisma } from "~/lib/prisma";

export const authMiddleware = createMiddleware(async (c, next) => {
  try {
    const authHeader = c.req.header("Authorization");

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);

      if (
        (auth as any).bearer &&
        typeof (auth as any).bearer.validateToken === "function"
      ) {
        try {
          const user = await (auth as any).bearer.validateToken(token);
          if (user) {
            c.set("user", user);
            c.set("authMethod", "bearer");
            return next();
          }
        } catch (tokenError) {
          console.log("Better Auth token validation failed, trying JWT");
        }
      }

      // Fallback: Validate JWT token manually
      try {
        const secret = process.env.BETTER_AUTH_SECRET || "your-secret-key";
        const decoded = verify(token, secret);

        const user = await prisma.user.findUnique({
          where: {
            id: typeof decoded.sub === "function" ? decoded.sub() : decoded.sub,
          },
        });

        if (user && !user.banned) {
          c.set("user", user);
          c.set("authMethod", "jwt");
          return next();
        }
      } catch (jwtError) {
        console.error("JWT validation error:", jwtError);
      }
    }

    const session = await auth.api.getSession({ headers: c.req.raw.headers });

    if (!session) {
      return c.json(
        err("Unauthorized. Please sign in or provide a valid token"),
        401,
      );
    }

    c.set("user", session.user);
    c.set("session", session.session);
    c.set("authMethod", "session");

    return next();
  } catch (error) {
    console.error("Authentication error:", error);
    return c.json(err("Authentication failed"), 401);
  }
});
