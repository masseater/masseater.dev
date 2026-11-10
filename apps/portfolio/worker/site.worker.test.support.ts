import { makeD1 } from "@masseater.dev/d1-test";
import { Array as Arr, Effect, MutableRef, Option, Schema, String as Str, pipe } from "effect";
import { vi } from "vite-plus/test";

type Element = Readonly<{ setAttribute: (name: string, value: string) => void }>;

type ElementHandlers = Readonly<{ element: (element: Element) => void }>;

type Rule = readonly [string, ElementHandlers];

type Rewriter = Readonly<{
  on: (selector: string, handlers: ElementHandlers) => Rewriter;
  transform: (response: Response) => Response;
}>;

const FIRST_SALT = "first-salt";

const MISSING_ARTICLE = "/blogs/missing";

const NOT_FOUND = 404;

const PAGE =
  '<!doctype html><html><head><style>body{margin:0}</style><script type="module" src="/assets/app.js"></script></head><body><p>本文</p><script>window.ready=true</script></body></html>';

const {
  closeDatabase,
  env: d1,
  resetDatabase,
} = makeD1({
  migrations: new URL("../drizzle/", import.meta.url).href,
  tables: ["star"],
});

const salt = MutableRef.make(FIRST_SALT);

const assetRequests = MutableRef.make<readonly Request[]>([]);

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

const assets: Pick<Fetcher, "fetch"> = {
  fetch: (input, init) => {
    const request = new Request(input, init);
    MutableRef.update(assetRequests, Arr.append(request));
    return Promise.resolve(assetFor(request));
  },
};

const env = {
  STARS: d1.DB,
  ASSETS: assets,
  get VISITOR_SALT(): string {
    return MutableRef.get(salt);
  },
};

const changeSalt = (next: string): Effect.Effect<void> =>
  Effect.sync(() => {
    MutableRef.set(salt, next);
  });

const resetSite = Effect.sync(() => {
  MutableRef.set(salt, FIRST_SALT);
  MutableRef.set(assetRequests, []);
}).pipe(Effect.andThen(resetDatabase));

const lastAssetRequest = Effect.sync(() => Arr.last(MutableRef.get(assetRequests)));

const StoredStars = Schema.Array(Schema.Struct({ visitor: Schema.String }));

const decodeStoredStars = Schema.decodeUnknownEffect(StoredStars);

const storedVisitors = Effect.promise(() => d1.DB.prepare("SELECT visitor FROM star").all()).pipe(
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

const HTMLRewriter = function HTMLRewriter(): Rewriter {
  return rewriterWith([]);
};

const stubRewriter = (): void => {
  vi.stubGlobal("HTMLRewriter", HTMLRewriter);
};

export {
  MISSING_ARTICLE,
  changeSalt,
  closeDatabase,
  env,
  lastAssetRequest,
  resetSite,
  storedVisitors,
  stubRewriter,
};
