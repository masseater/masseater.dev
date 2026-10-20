import { treaty } from "@elysiajs/eden";
import { createIsomorphicFn } from "@tanstack/react-start";
import { createEdenOptionsProxy } from "eden-tanstack-react-query";

import { site } from "#/shared/config";

import type { StarRoutes } from "./stars-routes.server";

const client = createIsomorphicFn()
  .server(() => treaty<StarRoutes>(site.url))
  .client(() => treaty<StarRoutes>(globalThis.location.origin));

const starQueries = createEdenOptionsProxy<StarRoutes>({ client: client() });

export { starQueries };
