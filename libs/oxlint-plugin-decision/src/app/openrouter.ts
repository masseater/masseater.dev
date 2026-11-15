import { syncProvider } from "./sync-provider.ts";

export const openRouter = syncProvider({
  name: "openrouter",
  worker: "openrouter-worker",
  requiredEnv: ["OPENROUTER_API_KEY"],
});
