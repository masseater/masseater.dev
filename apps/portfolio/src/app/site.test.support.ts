import { makeD1 } from "@masseater.dev/d1-test";
import {
  Array as Arr,
  Effect,
  MutableRef,
  Option,
  Record as Rec,
  Schema,
  String as Str,
  pipe,
} from "effect";

import type { SiteDependencies } from "./site.ts";

type Element = Readonly<{ setAttribute: (name: string, value: string) => void }>;

type ElementHandlers = Readonly<{ element: (element: Element) => void }>;

type Rule = readonly [string, ElementHandlers];

type Rewriter = Readonly<{
  on: (selector: string, handlers: ElementHandlers) => Rewriter;
  transform: (response: Response) => Response;
}>;

const FIRST_SALT = "first-salt";

export const MISSING_ARTICLE = "/blogs/missing";

const NOT_FOUND = 404;

const PAGE =
  '<!doctype html><html><head><style>body{margin:0}</style><script type="module" src="/assets/app.js"></script></head><body><p>本文</p><script>window.ready=true</script></body></html>';

const testD1 = makeD1({
  migrations: new URL("../../drizzle/", import.meta.url).href,
  tables: ["star"],
});

const { database, resetDatabase } = testD1;

export const { closeDatabase } = testD1;

const salt = MutableRef.make(FIRST_SALT);

const assetRequests = MutableRef.make<readonly Request[]>([]);

const flooded = MutableRef.make(false);

const limited = MutableRef.make<readonly string[]>([]);

const returned = MutableRef.make<readonly number[]>([]);

const tallied = (length: number): void => {
  MutableRef.update(returned, Arr.append(length));
};

const memberOf = (members: Readonly<Record<string, unknown>>, key: string | symbol): unknown =>
  Option.getOrUndefined(Rec.get(members, String(key)));

const counting = (statement: Readonly<D1PreparedStatement>): D1PreparedStatement =>
  new Proxy(statement, {
    get: (target, key) =>
      memberOf(
        {
          bind: (...values: readonly unknown[]) => counting(target.bind(...values)),
          all: () =>
            Effect.runPromise(
              Effect.promise(() => target.all()).pipe(
                Effect.tap(({ results }) =>
                  Effect.sync(() => {
                    tallied(results.length);
                  }),
                ),
              ),
            ),
          raw: () =>
            Effect.runPromise(
              Effect.promise(() => target.raw()).pipe(
                Effect.tap((rows) =>
                  Effect.sync(() => {
                    tallied(rows.length);
                  }),
                ),
              ),
            ),
          first: () => target.first(),
          run: () => target.run(),
        },
        key,
      ),
  });

const countingRows = (binding: Readonly<D1Database>): D1Database =>
  new Proxy(binding, {
    get: (target, key) =>
      memberOf(
        {
          prepare: (sql: string) => counting(target.prepare(sql)),
          exec: (sql: string) => target.exec(sql),
        },
        key,
      ),
  });

const limiter = {
  limit: ({ key }: Readonly<{ key: string }>): Promise<{ success: boolean }> => {
    MutableRef.update(limited, Arr.append(key));
    return Promise.resolve({ success: !MutableRef.get(flooded) });
  },
};

const missing = (): Response => new Response("", { status: NOT_FOUND });

const image = (): Response =>
  new Response("png", { headers: { "Content-Type": "image/png", ETag: '"image"' } });

const page = (): Response =>
  new Response(PAGE, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      ETag: '"page"',
      "Last-Modified": "Mon, 09 Nov 2026 00:00:00 GMT",
    },
  });

const assetFor = (request: Request): Response => {
  const { pathname } = new URL(request.url);
  if (pathname === MISSING_ARTICLE) {
    return missing();
  }
  if (Str.endsWith(".png")(pathname)) {
    return image();
  }
  return page();
};

const assets = {
  fetch: (input: Request | string, init?: Readonly<{ method: string }>): Promise<Response> => {
    const request = new Request(input, init);
    MutableRef.update(assetRequests, Arr.append(request));
    return Promise.resolve(assetFor(request));
  },
};

export const changeSalt = (next: string): Effect.Effect<void> =>
  Effect.sync(() => {
    MutableRef.set(salt, next);
  });

export const resetSite = Effect.sync(() => {
  MutableRef.set(salt, FIRST_SALT);
  MutableRef.set(assetRequests, []);
  MutableRef.set(flooded, false);
  MutableRef.set(limited, []);
  MutableRef.set(returned, []);
}).pipe(Effect.andThen(resetDatabase));

export const flood = Effect.sync(() => {
  MutableRef.set(flooded, true);
});

export const limitedKeys = Effect.sync(() => MutableRef.get(limited));

export const forgetReturnedRows = Effect.sync(() => {
  MutableRef.set(returned, []);
});

export const returnedRows = Effect.sync(() => MutableRef.get(returned));

export const lastAssetRequest = Effect.sync(() => Arr.last(MutableRef.get(assetRequests)));

const StoredStars = Schema.Array(Schema.Struct({ visitor: Schema.String }));

const decodeStoredStars = Schema.decodeUnknownEffect(StoredStars);

export const storedVisitors = database.pipe(
  Effect.flatMap((stars) => Effect.promise(() => stars.prepare("SELECT visitor FROM star").all())),
  Effect.flatMap(({ results }) => decodeStoredStars(results)),
  Effect.map(Arr.map(({ visitor }) => visitor)),
  Effect.orDie,
);

const tagPattern = (selector: string): RegExp => {
  const tags = pipe(selector, Str.split(","), Arr.map(Str.trim), Arr.join("|"));
  return new RegExp(`<(?:${tags})\\b`, "gu");
};

const attributesFrom = (handlers: ElementHandlers): string => {
  const attributes = MutableRef.make<readonly string[]>([]);
  handlers.element({
    setAttribute: (name, value) => {
      MutableRef.update(attributes, Arr.append(` ${name}="${value}"`));
    },
  });
  return Arr.join(MutableRef.get(attributes), "");
};

const rewrite = (html: string, [selector, handlers]: Rule): string => {
  const pattern = tagPattern(selector);
  const [head, ...rests] = Str.split(html, pattern);
  const tags = Arr.fromIterable(Str.matchAll(pattern)(html));
  const rewritten = Arr.zipWith(
    tags,
    rests,
    ([tag], rest) => tag + attributesFrom(handlers) + rest,
  );
  return Arr.join([head, ...rewritten], "");
};

const rewriting = (rules: readonly Rule[]): TransformStream<string, string> =>
  new TransformStream({
    transform: (chunk, controller) => {
      controller.enqueue(Arr.reduce(rules, chunk, rewrite));
    },
  });

const rewriterWith = (rules: readonly Rule[]): Rewriter => ({
  on: (selector, handlers) => rewriterWith([...rules, [selector, handlers]]),
  transform: (response) =>
    new Response(
      pipe(
        Option.fromNullishOr(response.body),
        Option.map((body) =>
          body
            .pipeThrough(new TextDecoderStream())
            .pipeThrough(rewriting(rules))
            .pipeThrough(new TextEncoderStream()),
        ),
        Option.getOrNull,
      ),
      response,
    ),
});

const HTMLRewriter = (): Rewriter => rewriterWith([]);

export const site: Effect.Effect<SiteDependencies> = database.pipe(
  Effect.map((stars) => ({
    bindings: {
      STARS: countingRows(stars),
      STARS_LIMITER: limiter,
      ASSETS: assets,
      VISITOR_SALT: MutableRef.get(salt),
    },
    rewriter: HTMLRewriter,
  })),
);
