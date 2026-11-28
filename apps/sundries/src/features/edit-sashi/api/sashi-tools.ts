import { READ_ONLY, failedAt, toolInputOf } from "@masseater.dev/mcp-tool-call";
import {
  ReferenceInput,
  ReferenceSchema,
  referenceContent,
  referencePath,
} from "@masseater.dev/sashi";
import type { Kind, Reference } from "@masseater.dev/sashi";
import type { McpServer } from "@modelcontextprotocol/server";
import { Array as Arr, DateTime, Effect, Option, Schema, String as Str, flow, pipe } from "effect";
import { Base64 } from "effect/encoding";
import { FetchHttpClient, HttpClient, HttpClientResponse } from "effect/http";

import { registerPublishTool, runToolIn } from "#/shared/api/index.ts";
import type { ContentBroker, PublishVerb } from "#/shared/api/index.ts";

import { ListInput } from "./sashi-input.ts";

export type SashiBindings = Readonly<{ SLOPPEDIA_GITHUB: ContentBroker }>;

const SITE = "https://masseater.dev";

const REFERENCES_URL = `${SITE}/sashi.json`;

const LIST_INPUT = toolInputOf(ListInput);

const ReferencesBody = Schema.Struct({ references: Schema.Array(ReferenceSchema) });

const fail = failedAt("masseater.dev");

const textOf = ({ title, note }: Reference): string =>
  Str.toLowerCase(Arr.join([title, note], "\n"));

const ofKind =
  (kind: Option.Option<Kind>) =>
  (reference: Reference): boolean =>
    Option.match(kind, { onNone: () => true, onSome: (wanted) => reference.kind === wanted });

const mentions =
  (query: Option.Option<string>) =>
  (reference: Reference): boolean =>
    Option.match(query, {
      onNone: () => true,
      onSome: (wanted) => Str.includes(Str.toLowerCase(wanted))(textOf(reference)),
    });

const listReferences = Effect.fn("listReferences")(function* listReferences(
  filter: typeof ListInput.Type,
) {
  const client = yield* HttpClient.HttpClient;
  const response = yield* client
    .get(REFERENCES_URL)
    .pipe(Effect.flatMap(HttpClientResponse.filterStatusOk));
  const { references } = yield* HttpClientResponse.schemaBodyJson(ReferencesBody)(response);
  const kind = ofKind(Option.fromNullishOr(filter.kind));
  const query = mentions(Option.fromNullishOr(filter.query));
  return pipe(
    references,
    Arr.filter((reference) => kind(reference) && query(reference)),
  );
}, Effect.mapError(fail));

const runFetchTool = runToolIn(FetchHttpClient.layer);

const registerList = (server: McpServer): McpServer => {
  server.registerTool(
    "list_sashi_references",
    {
      description: `List the owner's references for what they want (${SITE}/sashi), newest first. Call it before making something for the owner.`,
      inputSchema: LIST_INPUT,
      annotations: READ_ONLY,
    },
    (input) => listReferences(input).pipe(runFetchTool({ count: (found) => found.length })),
  );
  return server;
};

const publication = Effect.fn("publication")(function* publication(
  input: typeof ReferenceInput.Type,
) {
  const date = yield* DateTime.now.pipe(Effect.map(DateTime.formatIsoDateUtc));
  const content = yield* referenceContent({ date, input });
  return {
    path: referencePath(input.slug),
    branch: `sashi/${input.slug}`,
    title: (verb: PublishVerb): string => `docs(sashi): ${verb} ${input.slug}`,
    content: Base64.encode(content),
  };
});

export const registerSashiTools = ({
  SLOPPEDIA_GITHUB,
}: SashiBindings): ((server: McpServer) => McpServer) =>
  flow(
    registerList,
    registerPublishTool({
      broker: SLOPPEDIA_GITHUB,
      name: "write_sashi_reference",
      description: `Add or rewrite one reference on Sashi (${SITE}/sashi), the owner's shelf of things they point at to say what they want.`,
      schema: toolInputOf(ReferenceInput),
      publication,
      url: () => `${SITE}/sashi`,
    }),
  );
