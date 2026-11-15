import { syncProvider } from "./sync-provider.ts";

const openRouter = syncProvider({
  name: "openrouter",
  worker: "openrouter-worker",
  requiredEnv: ["OPENROUTER_API_KEY"],
});

export { openRouter };
