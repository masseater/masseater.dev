import type { Caller } from "@masseater.dev/mcp-tool-call";
import { NO_PROJECT, READ_ONLY, WRITE, one } from "@masseater.dev/mcp-tool-call";
import type { McpServer } from "@modelcontextprotocol/server";
import { Option, Schema, pipe } from "effect";

import { ListInput, ReplyInput, SendInput, TakeInput } from "./claude-request-input";
import { answer, enqueue, listed, take } from "./claude-requests";
import type { ClaudeRequest } from "./claude-requests";
import { meteredInput, runTool } from "./tool-call";

type Register = (caller: Caller) => (server: McpServer) => McpServer;

const SEND_DESCRIPTION =
  "持ち主の masseater の Claude Code プロジェクト「個人PJ」へ依頼を送る。1 時間以内にプロジェクトのスレッドが受け取って実行し、結果を返事として書く。返事は list_claude_replies で読む。返り値の id で返事を見分ける。";

const TAKE_DESCRIPTION =
  "Claude Code のプロジェクト「個人PJ」のスレッドが使う。まだ誰も受け取っていない依頼をすべて受け取り済みにして古い順に返す。受け取った依頼は自分で実行し、reply_to_request で返事を書く。";

const REPLY_DESCRIPTION =
  "Claude Code のスレッドが、take_claude_requests で受け取った依頼に返事を書く。結果、作ったものの URL、依頼した人への質問などを書く。";

const LIST_DESCRIPTION =
  "send_to_claude で送った依頼と、その受け取りの時刻・スレッドの URL・返事を返す。after を省くと新しい順に 50 件、after を渡すとその id より後を古い順に 50 件返す。";

const SEND_SCHEMA = SendInput.pipe(Schema.toStandardSchemaV1, Schema.toStandardJSONSchemaV1);

const TAKE_SCHEMA = TakeInput.pipe(Schema.toStandardSchemaV1, Schema.toStandardJSONSchemaV1);

const REPLY_SCHEMA = ReplyInput.pipe(Schema.toStandardSchemaV1, Schema.toStandardJSONSchemaV1);

const LIST_SCHEMA = ListInput.pipe(Schema.toStandardSchemaV1, Schema.toStandardJSONSchemaV1);

const count = (requests: readonly ClaudeRequest[]): number => requests.length;

const registerSend: Register = (caller) => (server) => {
  const meter = { tool: "send_to_claude", caller, project: NO_PROJECT } as const;
  server.registerTool(
    "send_to_claude",
    {
      description: SEND_DESCRIPTION,
      inputSchema: meteredInput(meter)(SEND_SCHEMA),
      annotations: WRITE,
    },
    (input) =>
      enqueue({ text: input.text, sender: caller.client }).pipe(
        runTool({ ...meter, input, count: one }),
      ),
  );
  return server;
};

const registerTake: Register = (caller) => (server) => {
  const meter = { tool: "take_claude_requests", caller, project: NO_PROJECT } as const;
  server.registerTool(
    "take_claude_requests",
    {
      description: TAKE_DESCRIPTION,
      inputSchema: meteredInput(meter)(TAKE_SCHEMA),
      annotations: WRITE,
    },
    (input) => take.pipe(runTool({ ...meter, input, count })),
  );
  return server;
};

const registerReply: Register = (caller) => (server) => {
  const meter = { tool: "reply_to_request", caller, project: NO_PROJECT } as const;
  server.registerTool(
    "reply_to_request",
    {
      description: REPLY_DESCRIPTION,
      inputSchema: meteredInput(meter)(REPLY_SCHEMA),
      annotations: WRITE,
    },
    (input) => answer(input).pipe(runTool({ ...meter, input, count: one })),
  );
  return server;
};

const registerList: Register = (caller) => (server) => {
  const meter = { tool: "list_claude_replies", caller, project: NO_PROJECT } as const;
  server.registerTool(
    "list_claude_replies",
    {
      description: LIST_DESCRIPTION,
      inputSchema: meteredInput(meter)(LIST_SCHEMA),
      annotations: READ_ONLY,
    },
    (input) => listed(Option.fromNullishOr(input.after)).pipe(runTool({ ...meter, input, count })),
  );
  return server;
};

const registerClaudeRequestTools: Register = (caller) => (server) =>
  pipe(
    server,
    registerSend(caller),
    registerTake(caller),
    registerReply(caller),
    registerList(caller),
  );

export { registerClaudeRequestTools };
export type { Register };
