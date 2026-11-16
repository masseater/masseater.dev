import type { Caller, UpstreamFailed } from "@masseater.dev/mcp-tool-call";
import { NO_PROJECT, READ_ONLY, failedAt, one, toolCalls } from "@masseater.dev/mcp-tool-call";
import { McpServer } from "@modelcontextprotocol/server";
import { env } from "cloudflare:workers";
import { Array as Arr, Effect, Option, Schema, pipe } from "effect";
import { constTrue } from "effect/Function";

import { AspectSchema, VerbSchema } from "#/shared/api/index.ts";
import type { Mark } from "#/shared/api/index.ts";
import { SERVER_NAME } from "#/shared/config/index.ts";
import { sourceOf } from "#/shared/lib/source.ts";

import { briefOf } from "./brief.ts";
import { listMarks } from "./mark-store.ts";

const SERVER_INFO = { name: SERVER_NAME, version: "0.0.0" };

const DESCRIPTION =
  "持ち主が YouTube・ニコニコ・SoundCloud の曲に付けた「しるし」を新しい順に返す。しるしは曲の範囲（秒）、好きか苦手か、どこが（リズム・ベース・コード・メロディ・音色・声・展開・ミックス）、持ち主の言葉からなる。曲を作る前や直す前に呼び、持ち主の好みの根拠として読む。url で 1 曲に絞り、verb と aspect で種類を絞る。";

const ListInputSchema = Schema.Struct({
  url: Schema.optionalKey(Schema.String),
  verb: Schema.optionalKey(VerbSchema),
  aspect: Schema.optionalKey(AspectSchema),
});

type ListInput = typeof ListInputSchema.Type;

const INPUT_SCHEMA = ListInputSchema.pipe(Schema.toStandardSchemaV1, Schema.toStandardJSONSchemaV1);

const { meteredInput, runTool } = toolCalls<UpstreamFailed>({
  dataset: () => env.TOOL_CALLS,
  describe: ({ service, message }) => ({
    errorTag: "UpstreamFailed",
    text: `${service} failed: ${message}`,
  }),
});

const fail = failedAt("d1");

const allows = <Wanted>(wanted: Wanted | undefined, ok: (value: Wanted) => boolean): boolean =>
  Option.match(Option.fromUndefinedOr(wanted), { onNone: constTrue, onSome: ok });

const matches =
  (input: ListInput) =>
  (mark: Mark): boolean =>
    allows(input.verb, (verb) => verb === mark.verb) &&
    allows(input.aspect, (aspect) => Arr.contains(mark.aspects, aspect));

const listed = (input: ListInput): Effect.Effect<readonly string[], UpstreamFailed> =>
  listMarks(Option.flatMap(Option.fromUndefinedOr(input.url), sourceOf)).pipe(
    Effect.mapBoth({
      onSuccess: (marks) => pipe(marks, Arr.filter(matches(input)), Arr.map(briefOf)),
      onFailure: fail,
    }),
  );

export const registerTools = (caller: Caller): McpServer => {
  const server = new McpServer(SERVER_INFO);
  server.registerTool(
    "list_marks",
    {
      description: DESCRIPTION,
      inputSchema: meteredInput({ tool: "list_marks", caller, project: NO_PROJECT })(INPUT_SCHEMA),
      annotations: READ_ONLY,
    },
    (input) =>
      listed(input).pipe(
        Effect.map(Arr.join("\n\n")),
        runTool({ tool: "list_marks", caller, project: NO_PROJECT, input, count: one }),
      ),
  );
  return server;
};
