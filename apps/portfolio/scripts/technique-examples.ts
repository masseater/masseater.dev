import { NodeRuntime, NodeServices } from "@effect/platform-node";
import {
  Array as Arr,
  Effect,
  FileSystem,
  Layer,
  Option,
  Order,
  Record as Rec,
  Schema,
  String as Str,
  pipe,
} from "effect";
import { FetchHttpClient } from "effect/http";

import { ExamplesFile, commons, pageImages, underscored } from "./wikimedia.ts";
import type { Examples, ExampleValue, Licensed } from "./wikimedia.ts";

const ARTICLE = "content/blogs/video-vj-techniques.md";
const OUTPUT = "src/entities/technique/model/generated/examples.json";
const WIKI = /\]\((?<url>https:\/\/(?<lang>en|ja)\.wikipedia\.org\/wiki\/[^)\s]+)\)/gu;

type Link = Readonly<{ url: string; lang: string; title: string }>;
type Image = Readonly<{ url: string; title: string; file: string }>;

const titleOf = (url: string): string => {
  const path = pipe(
    Arr.last(Str.split(url, "/wiki/")),
    Option.flatMap((wiki) => Arr.head(Str.split(wiki, "#"))),
    Option.getOrElse(() => ""),
  );
  return Str.replaceAll("_", " ")(decodeURIComponent(path));
};

const linkOf = (match: RegExpMatchArray): Option.Option<Link> => {
  const groups = Option.fromUndefinedOr(match.groups);
  const named = (name: string): Option.Option<string> =>
    pipe(groups, Option.flatMap(Rec.get(name)));
  return pipe(
    Option.all({ url: named("url"), lang: named("lang") }),
    Option.map(({ url, lang }) => ({ url, lang, title: titleOf(url) })),
  );
};

const linksIn = (article: string): readonly Link[] =>
  pipe(
    Arr.fromIterable(Str.matchAll(WIKI)(article)),
    Arr.flatMap((match) => Option.toArray(linkOf(match))),
    Arr.dedupeWith((left, right) => left.url === right.url),
  );

const imagesIn = Effect.fn("imagesIn")(function* imagesIn(lang: string, links: readonly Link[]) {
  const titles = pipe(
    links,
    Arr.map(({ title }) => title),
  );
  const files = yield* pageImages(lang, titles);
  return pipe(
    links,
    Arr.flatMap(({ url, title }) =>
      pipe(
        Rec.get(files, title),
        Option.map((file): Image => ({ url, title, file: underscored(file) })),
        Option.toArray,
      ),
    ),
  );
});

const examplesOf = (
  images: readonly Image[],
  licensed: Readonly<Record<string, Licensed>>,
): typeof Examples.Type =>
  pipe(
    images,
    Arr.flatMap(({ url, title, file }) =>
      pipe(
        Rec.get(licensed, file),
        Option.map((example) => [url, { title, ...example }] as const),
        Option.toArray,
      ),
    ),
    Rec.fromEntries,
  );

const byUrl = Order.mapInput(Order.String, ([url]: readonly [string, ExampleValue]) => url);

const collectImages = Effect.fn("collectImages")(function* collectImages(links: readonly Link[]) {
  const found = yield* pipe(
    links,
    Arr.groupBy(({ lang }) => lang),
    Rec.toEntries,
    Effect.forEach(([lang, group]) => imagesIn(lang, group)),
  );
  const images = Arr.flatten(found);
  const files = pipe(
    images,
    Arr.map(({ file }) => file),
    Arr.dedupe,
  );
  const licensed = yield* commons(Arr.sort(files, Order.String));
  return examplesOf(images, licensed);
});

const program = Effect.gen(function* collectExamples() {
  const fileSystem = yield* FileSystem.FileSystem;
  const article = yield* fileSystem.readFileString(ARTICLE);
  const links = linksIn(article);
  const collected = yield* collectImages(links);
  const previous = yield* fileSystem.readFileString(OUTPUT).pipe(
    Effect.flatMap(Schema.decodeEffect(ExamplesFile)),
    Effect.orElseSucceed((): typeof Examples.Type => ({})),
  );
  const merged = Rec.toEntries({ ...previous, ...collected });
  const sorted = Rec.fromEntries(Arr.sort(merged, byUrl));
  const encoded = yield* Schema.encodeEffect(ExamplesFile)(sorted);
  yield* fileSystem.writeFileString(OUTPUT, `${encoded}\n`);
  yield* Effect.logInfo("technique-examples.collected").pipe(
    Effect.annotateLogs({ examples: Rec.size(sorted), links: links.length }),
  );
});

const services = Layer.mergeAll(NodeServices.layer, FetchHttpClient.layer);

NodeRuntime.runMain(
  Layer.build(services).pipe(
    Effect.flatMap((context) => Effect.provideContext(program, context)),
    Effect.scoped,
  ),
);
