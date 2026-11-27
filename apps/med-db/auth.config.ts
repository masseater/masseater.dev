import { env } from "cloudflare:workers";

import { createAuth } from "./src/shared/auth/auth.server.ts";

export const auth = createAuth(env);
