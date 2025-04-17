import { createAuthClient } from "better-auth/react";
import { toast } from "sonner";

export const authClient = createAuthClient({
  baseURL: process.env.BETTER_AUTH_URL,
  fetchOptions: {
    onError: (ctx) => {
      toast.error(ctx.error.message);
    },
  },
});