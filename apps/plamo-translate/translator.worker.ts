import { DurableObject } from "cloudflare:workers";
import { Effect } from "effect";

import type { CompletionValue } from "./completion.ts";
import { complete, containerOf } from "./plamo-model.ts";
import type { Asked } from "./plamo-model.ts";
import { runLogged } from "./run.ts";
import { answer } from "./translation.ts";

const NOT_FOUND = 404;
const TRANSLATE_PATH = "/translate";
const ATTRIBUTION = "Built with PLaMo";

class PlamoModel extends DurableObject {
  public complete(asked: Asked): Promise<CompletionValue> {
    return runLogged(
      containerOf(this.ctx).pipe(Effect.flatMap((container) => complete(container, asked))),
    );
  }
}

type Route = (request: Request) => Promise<Response>;

const notFound: Route = () => Promise.resolve(new Response("Not Found", { status: NOT_FOUND }));

const ROUTES: Readonly<Record<string, Route>> = {
  [`POST ${TRANSLATE_PATH}`]: (request) => runLogged(answer(() => request.json())),
  "GET /": () => Promise.resolve(new Response(ATTRIBUTION)),
};

const worker = {
  fetch: (request: Request): Promise<Response> =>
    (ROUTES[`${request.method} ${new URL(request.url).pathname}`] ?? notFound)(request),
} satisfies ExportedHandler;

export { PlamoModel };
export { Translator } from "./translation.ts";
export default worker;
