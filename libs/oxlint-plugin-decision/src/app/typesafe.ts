import { JEV_MODEL } from "#/entities/decision/index.ts";

import { syncProvider } from "./sync-provider.ts";

export const typesafe = syncProvider({
  name: "typesafe",
  worker: "typesafe-worker",
  requiredEnv: ["TYPESAFE_API_KEY"],
  models: JEV_MODEL,
});
