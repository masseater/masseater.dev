import type { McpServer } from "@modelcontextprotocol/server";
import { env } from "cloudflare:workers";
import { Array as Arr, Effect, Option, Order, Schema, pipe } from "effect";

import { failedAt } from "#/features/mcp/model/upstream-failed";

import type { Caller } from "./caller";
import { DEFAULT_SLIDE_LIMIT, DeckInput, SlideSearchInput } from "./slides-input";
import { NO_PROJECT, READ_ONLY, runTool, meteredInput } from "./tool-call.server";

type SearchQuery = Readonly<{ query: string; limit: number; deck: Option.Option<string> }>;

const EMBEDDING_MODEL = "@cf/qwen/qwen3-embedding-0.6b";
const QUERY_INSTRUCTION =
  "Given a search query written in Japanese or English, retrieve presentation slides that answer the query";
const SLIDES_URL = "https://personal.masseater.dev/decks";
const FIRST_PAGE = 1;
const NO_PAGES = 0;
const GET_BY_IDS_LIMIT = 20;

const SlideMetadata = Schema.Struct({
  deck: Schema.String,
  title: Schema.String,
  page: Schema.Int,
  pages: Schema.Int,
  text: Schema.String,
});

type Slide = typeof SlideMetadata.Type;

const SEARCH_SCHEMA = SlideSearchInput.pipe(
  Schema.toStandardSchemaV1,
  Schema.toStandardJSONSchemaV1,
);
const DECK_SCHEMA = DeckInput.pipe(Schema.toStandardSchemaV1, Schema.toStandardJSONSchemaV1);

const fail = failedAt("slide index");

const slideId = (deck: string, page: number): string => `${deck}#${String(page)}`;

const withUrl = (slide: Slide): Slide & Readonly<{ url: string }> => ({
  ...slide,
  url: `${SLIDES_URL}/${slide.deck}.html`,
});

const slideOf = (stored: Readonly<{ metadata?: unknown }>): Option.Option<Slide> =>
  Schema.decodeUnknownOption(SlideMetadata)(stored.metadata);

const embed = (query: string): Effect.Effect<number[], ReturnType<typeof fail>> =>
  Effect.tryPromise({
    try: () => env.AI.run(EMBEDDING_MODEL, { queries: query, instruction: QUERY_INSTRUCTION }),
    catch: fail,
  }).pipe(
    Effect.flatMap(({ data }) =>
      Effect.fromOption(Arr.head(data ?? [])).pipe(
        Effect.mapError(() => fail(new Error("Workers AI returned no embedding"))),
      ),
    ),
  );

const queryOptions = ({ limit, deck }: SearchQuery): VectorizeQueryOptions =>
  Option.match(deck, {
    onNone: () => ({ topK: limit, returnMetadata: "all" }),
    onSome: (name) => ({ topK: limit, returnMetadata: "all", filter: { deck: name } }),
  });

const searchSlides = Effect.fn("searchSlides")(function* searchSlides(query: SearchQuery) {
  const vector = yield* embed(query.query);
  const { matches } = yield* Effect.tryPromise({
    try: () => env.SLIDE_INDEX.query(vector, queryOptions(query)),
    catch: fail,
  });
  return pipe(
    matches,
    Arr.flatMap((match) =>
      pipe(
        slideOf(match),
        Option.map((slide) => ({ ...withUrl(slide), score: match.score })),
        Option.toArray,
      ),
    ),
  );
});

const byIds = (ids: readonly string[]): Effect.Effect<readonly Slide[], ReturnType<typeof fail>> =>
  Effect.tryPromise({ try: () => env.SLIDE_INDEX.getByIds([...ids]), catch: fail }).pipe(
    Effect.map(Arr.flatMap((stored) => Option.toArray(slideOf(stored)))),
  );

const getDeck = Effect.fn("getDeck")(function* getDeck(deck: string) {
  const opening = yield* byIds([slideId(deck, FIRST_PAGE)]);
  const pages = pipe(
    Arr.head(opening),
    Option.match({ onNone: () => NO_PAGES, onSome: (first) => first.pages }),
  );
  const ids = Arr.makeBy(pages, (index) => slideId(deck, index + FIRST_PAGE));
  const batches = yield* Effect.forEach(Arr.chunksOf(ids, GET_BY_IDS_LIMIT), byIds, {
    concurrency: "unbounded",
  });
  return pipe(
    batches,
    Arr.flatten,
    Arr.sortWith((slide) => slide.page, Order.Number),
    Arr.map(withUrl),
  );
});

const registerSearch =
  (caller: Caller) =>
  (server: McpServer): McpServer => {
    server.registerTool(
      "search_slides",
      {
        description:
          "持ち主のスライドデッキを、意味の近さで1枚ずつ検索する。結果にはデッキ名、ページ番号、スライドの本文、デッキのURLが入る。",
        inputSchema: meteredInput({ tool: "search_slides", caller, project: NO_PROJECT })(
          SEARCH_SCHEMA,
        ),
        annotations: READ_ONLY,
      },
      (input) =>
        searchSlides({
          query: input.query,
          limit: input.limit ?? DEFAULT_SLIDE_LIMIT,
          deck: Option.fromNullishOr(input.deck),
        }).pipe(
          runTool({
            tool: "search_slides",
            caller,
            project: NO_PROJECT,
            input,
            count: (slides) => slides.length,
          }),
        ),
    );
    return server;
  };

const registerGetDeck =
  (caller: Caller) =>
  (server: McpServer): McpServer => {
    server.registerTool(
      "get_deck",
      {
        description: "デッキ名を指定して、そのデッキの全スライドの本文をページ順に返す。",
        inputSchema: meteredInput({ tool: "get_deck", caller, project: NO_PROJECT })(DECK_SCHEMA),
        annotations: READ_ONLY,
      },
      (input) =>
        getDeck(input.deck).pipe(
          runTool({
            tool: "get_deck",
            caller,
            project: NO_PROJECT,
            input,
            count: (slides) => slides.length,
          }),
        ),
    );
    return server;
  };

const registerSlideTools =
  (caller: Caller) =>
  (server: McpServer): McpServer =>
    pipe(server, registerSearch(caller), registerGetDeck(caller));

export { registerSlideTools };
