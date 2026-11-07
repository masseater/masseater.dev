import { NodeRuntime, NodeServices } from "@effect/platform-node";
import { launchBrowser, provideAtEntry } from "@ocr-decide/tooling";
import { Effect, FileSystem, Schema } from "effect";

import { htmlOf } from "./html.ts";
import { SyntheticPagesSchema } from "./page.ts";

const DATA = new URL("../data/", import.meta.url);

const DRAFTS = new URL("../.cache/html/", import.meta.url);

const ONE_AT_A_TIME = { concurrency: 1 } as const;

const SCALE = { clean: 2, small: 1, degraded: 1 } as const;

const render = Effect.gen(function* render() {
  const fs = yield* FileSystem.FileSystem;
  const pages = yield* fs
    .readFileString(new URL("synthetic.json", DATA).pathname)
    .pipe(Effect.flatMap(Schema.decodeEffect(SyntheticPagesSchema)));
  yield* fs.makeDirectory(DRAFTS.pathname, { recursive: true });
  const browser = yield* launchBrowser;
  yield* Effect.forEach(
    pages,
    (page) =>
      Effect.gen(function* screenshot() {
        const draft = new URL(`${page.id}.html`, DRAFTS);
        yield* fs.writeFileString(draft.pathname, htmlOf(page));
        const tab = yield* Effect.promise(() =>
          browser.newPage({ deviceScaleFactor: SCALE[page.condition] }),
        );
        yield* Effect.promise(() => tab.goto(draft.href));
        yield* Effect.promise(() => tab.evaluate("document.fonts.ready"));
        const image = yield* Effect.promise(() => tab.locator("body").screenshot({ type: "png" }));
        yield* fs.writeFile(new URL(`synthetic/${page.id}.png`, DATA).pathname, image);
        yield* Effect.promise(() => tab.close());
      }).pipe(Effect.withSpan("ocr-ja-bench.render", { attributes: { id: page.id } })),
    ONE_AT_A_TIME,
  );
});

NodeRuntime.runMain(render.pipe(provideAtEntry(NodeServices.layer)));
