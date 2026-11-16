import { treaty } from "@elysiajs/eden";
import { createIsomorphicFn } from "@tanstack/react-start";
import { createEdenOptionsProxy } from "eden-tanstack-react-query";

import { site } from "#/shared/config/index.ts";

import type { StarRoutes } from "./stars-routes.server.ts";

const client = createIsomorphicFn()
  .server(() => treaty<StarRoutes>(site.url))
  .client(() => treaty<StarRoutes>(globalThis.location.origin));

export const starQueries = createEdenOptionsProxy<StarRoutes>({ client: client() });
