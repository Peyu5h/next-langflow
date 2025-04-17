import * as z from "zod";

export const langchainStorageSchema = z.object({
  query: z.string(),
  answer: z.string(),
  timestamp: z.date().optional(),
  type: z.enum(["agent", "sequential", "parallel"]),
});

export type LangchainStorage = z.infer<typeof langchainStorageSchema>;
