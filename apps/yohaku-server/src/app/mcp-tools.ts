import { Fact, ManuscriptId } from "@masseater.dev/yohaku-protocol";
import { McpServer } from "@modelcontextprotocol/server";
import type { CallToolResult } from "@modelcontextprotocol/server";
import { Cause, Effect, Schema } from "effect";
import type { Context } from "effect";
import type { SecureRandom } from "effect/crypto";
import type { SqlClient } from "effect/sql";

import { listManuscripts, readParagraphs } from "#entities/manuscript";
import { NO_MANUSCRIPT, addSource, listFacts } from "#entities/source";

const SERVER_INFO = { name: "yohaku", version: "0.1.0" };
const READ = { readOnlyHint: true } as const;
const WRITE = { readOnlyHint: false, destructiveHint: false } as const;

type Services = SqlClient.SqlClient | SecureRandom.SecureRandom;

const NO_INPUT = Schema.Struct({}).pipe(Schema.toStandardSchemaV1, Schema.toStandardJSONSchemaV1);

const READ_INPUT = Schema.Struct({
  id: ManuscriptId.annotate({ description: "list_manuscripts が返す原稿の id" }),
}).pipe(Schema.toStandardSchemaV1, Schema.toStandardJSONSchemaV1);

const ADD_INPUT = Schema.Struct({
  label: Schema.String.annotate({ description: "資料の短い名前。例: pixiv 百科事典 ヤチヨ" }),
  facts: Schema.Array(Fact).annotate({
    description:
      "資料から取り出した事実。kind は character・voice・event・knowledge・setting・idea のどれか。when は作中の時点で、分からなければ null",
  }),
}).pipe(Schema.toStandardSchemaV1, Schema.toStandardJSONSchemaV1);

const encodeJson = Schema.encodeEffect(Schema.fromJsonString(Schema.Unknown));

const asText = (text: string): CallToolResult => ({ content: [{ type: "text", text }] });

const asError = (cause: Cause.Cause<unknown>): CallToolResult => ({
  content: [{ type: "text", text: Cause.pretty(cause) }],
  isError: true,
});

type Runner = <Value, Failure>(
  effect: Effect.Effect<Value, Failure, Services>,
) => Promise<CallToolResult>;

const runnerFor =
  (context: Context.Context<Services>): Runner =>
  (effect) =>
    effect.pipe(
      Effect.flatMap(encodeJson),
      Effect.map(asText),
      Effect.catchCause((cause) => Effect.succeed(asError(cause))),
      Effect.provideContext(context),
      Effect.runPromise,
    );

interface Caller {
  readonly run: Runner;
  readonly client: string;
}

const toolServer = ({ run, client }: Caller): McpServer => {
  const server = new McpServer(SERVER_INFO);
  server.registerTool(
    "list_manuscripts",
    {
      description:
        "書き手の原稿の一覧を返す。題名は書き手が付けたもの（by: writer）か AI の仮のもの（by: ai）",
      inputSchema: NO_INPUT,
      annotations: READ,
    },
    () => run(listManuscripts()),
  );
  server.registerTool(
    "read_manuscript",
    {
      description: "原稿の段落を順に返す。本文・メモ・ネタが混ざっている",
      inputSchema: READ_INPUT,
      annotations: READ,
    },
    ({ id }) => run(readParagraphs(id)),
  );
  server.registerTool(
    "list_facts",
    {
      description:
        "エディタがすでに持っている作品理解（人物・口調・出来事・知識・設定）を返す。add_source の前に読み、重複を避ける",
      inputSchema: NO_INPUT,
      annotations: READ,
    },
    () => run(listFacts()),
  );
  server.registerTool(
    "add_source",
    {
      description:
        "原作の資料や視聴メモから取り出した事実を、出典つきでエディタの作品理解に足す。書き手はエディタの資料の画面からいつでも戻せる",
      inputSchema: ADD_INPUT,
      annotations: WRITE,
    },
    ({ label, facts }) =>
      run(addSource({ label, origin: "mcp", client, manuscriptId: NO_MANUSCRIPT, facts })),
  );
  return server;
};

/** @internal */
const toolServers = Effect.gen(function* toolServers() {
  const context = yield* Effect.context<Services>();
  const run = runnerFor(context);
  return (client: string): McpServer => toolServer({ run, client });
});

export { toolServers };
