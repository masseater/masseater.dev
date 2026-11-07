import { run } from "@r_masseater/workers-tracing/effect";
import { requestSpan, serverFnSpan } from "@r_masseater/workers-tracing/tanstack-start";
import { createMiddleware, createStart } from "@tanstack/react-start";
import { Effect, Option } from "effect";

import { withWebAnalytics } from "#/app/server/web-analytics.server";
import { SEARCH_INDEX_ORIGIN } from "#/shared/config";

const noindex = createMiddleware().server(({ next }) =>
  run(
    Effect.promise(() => Promise.resolve(next())).pipe(
      Effect.map(({ response }) => {
        const unindexed = new Response(response.body, response);
        unindexed.headers.set("X-Robots-Tag", "noindex");
        return unindexed;
      }),
    ),
  ),
);

const webAnalytics = createMiddleware().server(({ next }) =>
  run(
    Effect.promise(() => Promise.resolve(next())).pipe(
      Effect.map(({ response }) => withWebAnalytics(response)),
    ),
  ),
);

const startInstance = createStart(() => ({
  requestMiddleware: [
    requestSpan,
    webAnalytics,
    ...Option.match(SEARCH_INDEX_ORIGIN, {
      onNone: () => [noindex],
      onSome: () => [],
    }),
  ],
  functionMiddleware: [serverFnSpan],
}));

export { startInstance };
