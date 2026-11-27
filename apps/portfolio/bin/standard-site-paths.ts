import { AtpAgent } from "@atproto/api";
import { runMain } from "@effect/platform-node/NodeRuntime";
import { layer as nodeServices } from "@effect/platform-node/NodeServices";
import {
  Array as Arr,
  Config,
  Effect,
  FileSystem,
  Layer,
  Option,
  Redacted,
  Schema,
  String as Str,
  pipe,
} from "effect";
import type { PlatformError } from "effect/PlatformError";

import { movedDocumentPath } from "#/app/vite/standard-site-paths.ts";

const SERVICE = "https://bsky.social";
const DOCUMENT = "site.standard.document";
const SOURCE_DIR = "content/slog";
const CONFIG_FILE = "sequoia.json";
const PAGE_SIZE = 100;
const MARKDOWN = /\.md$/u;

const SequoiaConfig = Schema.fromJsonString(Schema.Struct({ publicationUri: Schema.String }));

const Document = Schema.Struct({ site: Schema.String, path: Schema.String });

const decodeConfig = Schema.decodeUnknownEffect(SequoiaConfig);

const decodeDocument = Schema.decodeUnknownOption(Document);

const taggedError = Schema.TaggedError;

class AtprotoFailed extends taggedError<AtprotoFailed, { readonly brand: unique symbol }>()(
  "AtprotoFailed",
  { step: Schema.String, message: Schema.String },
) {}

type Entry = Readonly<{ uri: string; cid: string; value: Readonly<Record<string, unknown>> }>;

type Page = Readonly<{ entries: readonly Entry[]; cursor: Option.Option<string> }>;

type Change = Readonly<{ entry: Entry; path: string }>;

type Repository = Readonly<{
  list: (cursor: Option.Option<string>) => Effect.Effect<Page, AtprotoFailed>;
  put: (change: Change) => Effect.Effect<void, AtprotoFailed>;
}>;

const attempt = <Value>(
  step: string,
  run: () => Promise<Value>,
): Effect.Effect<Value, AtprotoFailed> =>
  Effect.tryPromise({
    try: run,
    catch: (error) => AtprotoFailed.make({ step, message: String(error) }),
  });

const recordKey = (uri: string): string =>
  pipe(
    Str.split("/")(uri),
    Arr.last,
    Option.getOrElse(() => ""),
  );

const openRepository = (
  credentials: Readonly<{ identifier: string; password: string }>,
): Effect.Effect<Repository, AtprotoFailed> =>
  Effect.gen(function* signIn() {
    const agent = new AtpAgent({ service: SERVICE });
    const { data } = yield* attempt("login", () => agent.login(credentials));
    const repo = data.did;
    return {
      list: (cursor) =>
        attempt("listRecords", () =>
          agent.com.atproto.repo.listRecords({
            repo,
            collection: DOCUMENT,
            limit: PAGE_SIZE,
            ...Option.match(cursor, { onNone: () => ({}), onSome: (value) => ({ cursor: value }) }),
          }),
        ).pipe(
          Effect.map(({ data: page }) => ({
            entries: page.records,
            cursor: Option.fromNullishOr(page.cursor),
          })),
        ),
      put: ({ entry, path }) =>
        attempt("putRecord", () =>
          agent.com.atproto.repo.putRecord({
            repo,
            collection: DOCUMENT,
            rkey: recordKey(entry.uri),
            record: { ...entry.value, path },
            swapRecord: entry.cid,
          }),
        ).pipe(Effect.asVoid),
    };
  });

const collect = (
  repository: Repository,
  cursor: Option.Option<string>,
  seen: readonly Entry[],
): Effect.Effect<readonly Entry[], AtprotoFailed> =>
  repository.list(cursor).pipe(
    Effect.flatMap((page) => {
      const all = [...seen, ...page.entries];
      return Option.match(page.cursor, {
        onNone: () => Effect.succeed(all),
        onSome: (next) => collect(repository, Option.some(next), all),
      });
    }),
  );

const move = (repository: Repository, change: Change): Effect.Effect<void, AtprotoFailed> => {
  const logged = Effect.logInfo("standard-site.moved").pipe(
    Effect.annotateLogs({ path: change.path }),
  );
  return repository.put(change).pipe(Effect.andThen(logged));
};

const plan = (
  entries: readonly Entry[],
  slugs: readonly string[],
  publicationUri: string,
): readonly Change[] =>
  pipe(
    entries,
    Arr.map((entry) =>
      pipe(
        decodeDocument(entry.value),
        Option.filter(({ site }) => site === publicationUri),
        Option.flatMap(({ path }) => movedDocumentPath({ slugs, path })),
        Option.map((path) => ({ entry, path })),
      ),
    ),
    Arr.getSomes,
  );

const slugsIn = (
  directory: string,
): Effect.Effect<readonly string[], PlatformError, FileSystem.FileSystem> =>
  FileSystem.FileSystem.pipe(
    Effect.flatMap((fileSystem) => fileSystem.readDirectory(directory)),
    Effect.map((names) =>
      pipe(
        names,
        Arr.filter(Str.endsWith(".md")),
        Arr.map((name) => Str.replace(MARKDOWN, "")(name)),
      ),
    ),
  );

const program = Effect.gen(function* moveDocuments() {
  const fileSystem = yield* FileSystem.FileSystem;
  const identifier = yield* Config.String("ATP_IDENTIFIER");
  const password = yield* Config.Redacted("ATP_APP_PASSWORD");
  const { publicationUri } = yield* fileSystem
    .readFileString(CONFIG_FILE)
    .pipe(Effect.flatMap(decodeConfig));
  const slugs = yield* slugsIn(SOURCE_DIR);
  const repository = yield* openRepository({ identifier, password: Redacted.value(password) });
  const entries = yield* collect(repository, Option.none(), []);
  const changes = plan(entries, slugs, publicationUri);
  yield* Effect.forEach(changes, (change) => move(repository, change), { concurrency: 1 });
  yield* Effect.logInfo("standard-site.paths").pipe(
    Effect.annotateLogs({ documents: entries.length, moved: changes.length }),
  );
});

runMain(
  nodeServices.pipe(
    Layer.build,
    Effect.flatMap((context) =>
      Effect.provideContext(program.pipe(Effect.withSpan("standard-site.paths")), context),
    ),
    Effect.scoped,
  ),
);
