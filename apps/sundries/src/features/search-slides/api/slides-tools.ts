import { failedAt, READ_ONLY, toolInputOf } from "@masseater.dev/mcp-tool-call";
import type { McpServer } from "@modelcontextprotocol/server";
import { runWorkersAi } from "@r_masseater/workers-tracing/workers-ai";
import { Array as Arr, Effect, Option, Order, Schema, flow, pipe } from "effect";

import { runTool } from "#/shared/api/index.ts";

import { DEFAULT_SLIDE_LIMIT, DeckInput, SlideSearchInput } from "./slides-input.ts";

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

const SEARCH_SCHEMA = toolInputOf(SlideSearchInput);
const DECK_SCHEMA = toolInputOf(DeckInput);

const fail = failedAt("slide index");

const slideId = (deck: string, page: number): string => `${deck}#${String(page)}`;

const withUrl = (slide: Slide): Slide & Readonly<{ url: string }> => ({
  ...slide,
  url: `${SLIDES_URL}/${slide.deck}.html`,
});

const slideOf = (stored: Readonly<{ metadata?: unknown }>): Option.Option<Slide> =>
  Schema.decodeUnknownOption(SlideMetadata)(stored.metadata);

export type SlideBindings = Readonly<{ AI: Ai; SLIDE_INDEX: VectorizeIndex }>;

const embed = (
  { AI }: SlideBindings,
  query: string,
): Effect.Effect<number[], ReturnType<typeof fail>> =>
  runWorkersAi({
    operation: "embeddings",
    model: EMBEDDING_MODEL,
    caller: "sundries.slides-search",
    call: (options) =>
      AI.run(EMBEDDING_MODEL, { queries: query, instruction: QUERY_INSTRUCTION }, options),
  }).pipe(
    Effect.mapError(({ cause }) => fail(cause)),
    Effect.flatMap(({ data }) =>
      Effect.fromOption(Arr.head(data ?? [])).pipe(
        Effect.mapError(() => fail(new Error("Workers AI returned no embedding"))),
      ),
    ),
  );

const queryOptions = ({
  limit,
  deck,
}: Readonly<{
  query: string;
  limit: number;
  deck: Option.Option<string>;
}>): VectorizeQueryOptions =>
  Option.match(deck, {
    onNone: () => ({ topK: limit, returnMetadata: "all" }),
    onSome: (name) => ({ topK: limit, returnMetadata: "all", filter: { deck: name } }),
  });

export const searchSlides = Effect.fn("searchSlides")(function* searchSlides(
  bindings: SlideBindings,
  query: Readonly<{ query: string; limit: number; deck: Option.Option<string> }>,
) {
  const vector = yield* embed(bindings, query.query);
  const { matches } = yield* Effect.tryPromise({
    try: () => bindings.SLIDE_INDEX.query(vector, queryOptions(query)),
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

const byIds =
  ({ SLIDE_INDEX }: SlideBindings) =>
  (ids: readonly string[]): Effect.Effect<readonly Slide[], ReturnType<typeof fail>> =>
    Effect.tryPromise({ try: () => SLIDE_INDEX.getByIds([...ids]), catch: fail }).pipe(
      Effect.map(Arr.flatMap((stored) => Option.toArray(slideOf(stored)))),
    );

const getDeck = Effect.fn("getDeck")(function* getDeck(bindings: SlideBindings, deck: string) {
  const opening = yield* byIds(bindings)([slideId(deck, FIRST_PAGE)]);
  const pages = pipe(
    Arr.head(opening),
    Option.match({ onNone: () => NO_PAGES, onSome: (first) => first.pages }),
  );
  const ids = Arr.makeBy(pages, (index) => slideId(deck, index + FIRST_PAGE));
  const batches = yield* Effect.forEach(Arr.chunksOf(ids, GET_BY_IDS_LIMIT), byIds(bindings), {
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
  (bindings: SlideBindings) =>
  (server: McpServer): McpServer => {
    server.registerTool(
      "search_slides",
      {
        description: "Search the owner's slide decks by meaning, one slide per result.",
        inputSchema: SEARCH_SCHEMA,
        annotations: READ_ONLY,
      },
      (input) =>
        searchSlides(bindings, {
          query: input.query,
          limit: input.limit ?? DEFAULT_SLIDE_LIMIT,
          deck: Option.fromNullishOr(input.deck),
        }).pipe(runTool({ count: (slides) => slides.length })),
    );
    return server;
  };

const registerGetDeck =
  (bindings: SlideBindings) =>
  (server: McpServer): McpServer => {
    server.registerTool(
      "get_deck",
      {
        description: "Return the text of every slide in a deck, in page order.",
        inputSchema: DECK_SCHEMA,
        annotations: READ_ONLY,
      },
      (input) => getDeck(bindings, input.deck).pipe(runTool({ count: (slides) => slides.length })),
    );
    return server;
  };

export const registerSlideTools = (bindings: SlideBindings): ((server: McpServer) => McpServer) =>
  flow(registerSearch(bindings), registerGetDeck(bindings));
