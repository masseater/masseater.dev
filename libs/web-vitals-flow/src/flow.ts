import { Launcher } from "chrome-launcher";
import { Array, Effect, Option, Result, Schema, pipe } from "effect";
import { startFlow } from "lighthouse";
import { launch } from "puppeteer-core";
import type { Browser, ElementHandle, Page, Point } from "puppeteer-core";

const taggedError = Schema.TaggedError;

class BrowserError extends taggedError<BrowserError, { readonly brand: unique symbol }>()(
  "BrowserError",
  { cause: Schema.Unknown },
) {}

const attempt = <Value>(evaluate: () => Promise<Value>): Effect.Effect<Value, BrowserError> =>
  Effect.tryPromise({ try: evaluate, catch: (cause) => BrowserError.make({ cause }) });

const openBrowser = (chromeFlags: readonly string[]): Effect.Effect<Browser, BrowserError> =>
  Effect.gen(function* open() {
    const installation = yield* Effect.try({
      try: () => Launcher.getFirstInstallation(),
      catch: (cause) => BrowserError.make({ cause }),
    });
    const executablePath = yield* Option.fromNullishOr(installation).pipe(
      Effect.fromOption,
      Effect.mapError(() =>
        BrowserError.make({
          cause: "Chrome was not found. Set CHROME_PATH to its executable.",
        }),
      ),
    );
    return yield* attempt(() => launch({ executablePath, args: [...chromeFlags] }));
  });

const withoutHash = (url: string): string => {
  const parsed = new URL(url);
  parsed.hash = "";
  return parsed.href;
};

const hrefsOn = (page: Page): Effect.Effect<readonly string[], BrowserError> =>
  attempt(() =>
    page.$$eval("a[href]", (anchors) => {
      const hrefs: string[] = [];
      for (const anchor of anchors) {
        if (anchor.origin === location.origin) {
          hrefs.push(anchor.href);
        }
      }
      return hrefs;
    }),
  );

const linksOn = (page: Page): Effect.Effect<readonly string[], BrowserError> =>
  Effect.map(hrefsOn(page), (hrefs) =>
    pipe(
      hrefs,
      Array.map((href) => withoutHash(href)),
      Array.dedupe,
      Array.filter((href) => href !== withoutHash(page.url())),
    ),
  );

interface Session {
  readonly page: Page;
  readonly flow: Awaited<ReturnType<typeof startFlow>>;
}

const isTopmostAt = (
  anchor: ElementHandle<HTMLAnchorElement>,
  { x, y }: Readonly<Point>,
): Effect.Effect<boolean, BrowserError> =>
  attempt(() =>
    anchor.evaluate(
      (element, pointX, pointY) => {
        const hit = document.elementFromPoint(pointX, pointY);
        return hit !== null && element.contains(hit);
      },
      x,
      y,
    ),
  );

const pointToClick = (
  anchor: ElementHandle<HTMLAnchorElement>,
): Effect.Effect<Option.Option<Point>, BrowserError> =>
  Effect.gen(function* point() {
    yield* attempt(() => anchor.scrollIntoView());
    const center = yield* Effect.option(attempt(() => anchor.clickablePoint()));
    if (Option.isNone(center)) {
      return center;
    }
    const topmost = yield* isTopmostAt(anchor, center.value);
    if (!topmost) {
      return Option.none<Point>();
    }
    return center;
  });

const clickablePointTo = (
  page: Page,
  target: string,
): Effect.Effect<Option.Option<Point>, BrowserError> =>
  Effect.gen(function* find() {
    const anchors = yield* attempt(() => page.$$("a[href]"));
    return yield* Effect.findFirstFilter(anchors, (anchor) =>
      Effect.gen(function* candidate() {
        const href = yield* attempt(() => anchor.evaluate((element) => element.href));
        if (withoutHash(href) !== target) {
          return Result.fail(anchor);
        }
        const point = yield* pointToClick(anchor);
        return Result.fromOption(point, () => anchor);
      }),
    );
  });

const clickAt = (
  page: Page,
  target: string,
  { x, y }: Readonly<Point>,
): Effect.Effect<void, BrowserError> =>
  attempt(() =>
    Promise.all([
      page.waitForFunction(
        (href) => {
          const here = new URL(location.href);
          here.hash = "";
          return here.href === href && document.readyState === "complete";
        },
        {},
        target,
      ),
      page.mouse.click(x, y),
    ]),
  );

const measureTransition = (
  { page, flow }: Session,
  url: string,
  link: string,
): Effect.Effect<Option.Option<string>, BrowserError> =>
  Effect.gen(function* transition() {
    const name = `${url} -> ${link}`;
    yield* attempt(() => page.goto(url, { waitUntil: "load" }));
    const point = yield* clickablePointTo(page, link);
    yield* Effect.annotateCurrentSpan("web_vitals.link.clickable", Option.isSome(point));
    if (Option.isNone(point)) {
      return Option.some(name);
    }
    yield* attempt(() => flow.startTimespan({ name }));
    yield* clickAt(page, link, point.value);
    yield* attempt(() => flow.endTimespan());
    return Option.none<string>();
  }).pipe(Effect.withSpan("web-vitals.transition", { attributes: { from: url, to: link } }));

const measurePage = (
  session: Session,
  url: string,
): Effect.Effect<readonly string[], BrowserError> =>
  Effect.gen(function* visit() {
    yield* attempt(() => session.flow.navigate(url, { name: `load ${url}` })).pipe(
      Effect.withSpan("web-vitals.load", { attributes: { url } }),
    );
    const links = yield* linksOn(session.page);
    const skipped = yield* pipe(
      links,
      Effect.forEach((link) => measureTransition(session, url, link)),
    );
    return Array.getSomes(skipped);
  });

const measureFlow = Effect.fn("web-vitals.flow")(function* measureFlow(
  urls: readonly string[],
  chromeFlags: readonly string[],
) {
  const browser = yield* Effect.acquireRelease(openBrowser(chromeFlags), (opened) =>
    Effect.promise(() => opened.close()),
  );
  const page = yield* attempt(() => browser.newPage());
  const flow = yield* attempt(() => startFlow(page, { name: "web-vitals" }));
  const skipped = yield* pipe(
    urls,
    Effect.forEach((url) => measurePage({ page, flow }, url)),
  );
  const result = yield* attempt(() => flow.createFlowResult()).pipe(
    Effect.withSpan("web-vitals.audit"),
  );
  const html = yield* attempt(() => flow.generateReport());
  return { result, html, unclickable: Array.flatten(skipped) };
}, Effect.scoped);

export { measureFlow };
