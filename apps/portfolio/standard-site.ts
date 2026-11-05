import { NodeRuntime, NodeServices } from "@effect/platform-node";
import {
  Array as Arr,
  Effect,
  FileSystem,
  Layer,
  Option,
  Path,
  Record as Rec,
  Schema,
  String as Str,
  Struct,
  pipe,
} from "effect";
import type { PlatformError } from "effect/PlatformError";
import { parse, stringify } from "yaml";

import { Frontmatter } from "#/entities/entry/model/entry";

import { entryDates } from "./remark-git-date.ts";
import type { Dates } from "./remark-git-date.ts";

const SOURCE_DIR = "content/blogs";
const OUTPUT_DIR = "node_modules/.cache/standard-site/blogs";
const FRONTMATTER = /^---\n(?<yaml>[\s\S]*?)\n---\n(?<body>[\s\S]*)$/u;

const BlogFrontmatter = Schema.Struct(Struct.omit(Frontmatter.fields, ["date", "updated"]));

const decodeFrontmatter = Schema.decodeUnknownEffect(BlogFrontmatter);

const taggedError = Schema.TaggedError;

class MissingFrontmatter extends taggedError<
  MissingFrontmatter,
  { readonly brand: unique symbol }
>()("MissingFrontmatter", { file: Schema.String }) {}

type Parts = Readonly<{ yaml: string; body: string }>;

const split = (file: string, text: string): Effect.Effect<Parts, MissingFrontmatter> =>
  pipe(
    Option.fromNullishOr(FRONTMATTER.exec(text)),
    Option.flatMap((match) => Option.fromNullishOr(match.groups)),
    Option.map((groups) => ({
      yaml: pipe(
        Rec.get(groups, "yaml"),
        Option.getOrElse(() => ""),
      ),
      body: pipe(
        Rec.get(groups, "body"),
        Option.getOrElse(() => ""),
      ),
    })),
    Effect.fromOption,
    Effect.mapError(() => MissingFrontmatter.make({ file })),
  );

type Blog = typeof BlogFrontmatter.Type;

const isPublic = ({ published, stage }: Blog): boolean => published && stage !== "idea";

const render = (frontmatter: Blog, { date, updated }: Dates, body: string): string =>
  `---\n${stringify(
    {
      title: frontmatter.title,
      description: frontmatter.description,
      tags: frontmatter.tags,
      publishDate: date,
      updatedAt: updated,
    },
    { lineWidth: 0 },
  )}---\n${body}`;

const stage = (
  file: string,
): Effect.Effect<
  boolean,
  MissingFrontmatter | Schema.SchemaError | PlatformError,
  FileSystem.FileSystem | Path.Path
> =>
  Effect.gen(function* stageBlog() {
    const fileSystem = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const source = path.join(SOURCE_DIR, file);
    const { yaml, body } = yield* split(file, yield* fileSystem.readFileString(source));
    const frontmatter = yield* decodeFrontmatter(parse(yaml));
    if (!isPublic(frontmatter)) {
      return false;
    }
    const dates = yield* entryDates(source);
    yield* fileSystem.writeFileString(
      path.join(OUTPUT_DIR, file),
      render(frontmatter, dates, body),
    );
    return true;
  });

const program = Effect.gen(function* stageBlogs() {
  const fileSystem = yield* FileSystem.FileSystem;
  yield* fileSystem.remove(OUTPUT_DIR, { recursive: true, force: true });
  yield* fileSystem.makeDirectory(OUTPUT_DIR, { recursive: true });
  const files = pipe(yield* fileSystem.readDirectory(SOURCE_DIR), Arr.filter(Str.endsWith(".md")));
  const staged = yield* Effect.all(pipe(files, Arr.map(stage)), { concurrency: "unbounded" });
  const count = pipe(staged, Arr.filter(Boolean)).length;
  yield* Effect.logInfo("standard-site.staged").pipe(Effect.annotateLogs({ count }));
});

NodeRuntime.runMain(
  Layer.build(NodeServices.layer).pipe(
    Effect.flatMap((context) =>
      Effect.provideContext(program.pipe(Effect.withSpan("standard-site.stage")), context),
    ),
    Effect.scoped,
  ),
);
