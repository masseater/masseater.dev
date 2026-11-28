import { makeD1 } from "@masseater.dev/d1-test";
import { authInfoOf } from "@masseater.dev/mcp-tool-call";
import { createMcpHandler } from "@modelcontextprotocol/server";
import {
  Array as Arr,
  Boolean as Bool,
  Effect,
  Option,
  Record as Rec,
  Schema,
  String as Str,
  pipe,
} from "effect";

import { registerClaudeRequestTools } from "#/features/request-claude/index.ts";
import type { RequestBindings } from "#/features/request-claude/index.ts";

import { serverOf } from "./tools.ts";

const MIGRATIONS = new URL("../../../migrations/", import.meta.url).href;

const d1 = makeD1({
  migrations: MIGRATIONS,
  tables: ["claude_requests", "schedules", "schedule_revisions"],
});

export const { closeDatabase, resetDatabase } = d1;

export const wakes: {
  outcome: "fired" | "rejected";
  count: number;
  projects: (string | undefined)[];
} = {
  outcome: "fired",
  count: 0,
  projects: [],
};

const routine: RequestBindings["CLAUDE_ROUTINE"] = {
  fire: (project) => {
    wakes.count += 1;
    wakes.projects.push(project);
    return Promise.resolve(wakes.outcome);
  },
  register: () => Promise.resolve(true),
};

export const bindings: Effect.Effect<RequestBindings> = d1.database.pipe(
  Effect.map((database) => ({ CLAUDE_REQUESTS: database, CLAUDE_ROUTINE: routine })),
);

export type Args = Readonly<Record<string, unknown>>;

export type Called = Readonly<{ isError: boolean; text: string }>;

const DATA_LINE = /^data: (?<json>.+)$/mu;

const CallResult = Schema.Struct({
  content: Schema.Array(Schema.Struct({ type: Schema.String, text: Schema.String })),
  isError: Schema.optionalKey(Schema.Boolean),
});

const decodeResult = Schema.decodeEffect(
  Schema.fromJsonString(Schema.Struct({ result: CallResult })),
);

const decodeJson = Schema.decodeEffect(Schema.fromJsonString(Schema.Unknown));

const encodeJson = Schema.encodeEffect(Schema.fromJsonString(Schema.Unknown));

const mcpRequest = (body: string): Request =>
  new Request("https://sundries.masseater.dev/mcp", {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json, text/event-stream" },
    body,
  });

const payloadOf = (text: string): string =>
  pipe(
    text,
    Str.match(DATA_LINE),
    Option.flatMap(({ groups }) => Option.fromNullishOr(groups)),
    Option.flatMap(Rec.get("json")),
    Option.getOrElse(() => text),
  );

export const call =
  (client: string) =>
  (name: string) =>
  (args: Args): Effect.Effect<Called> =>
    Effect.gen(function* called() {
      const body = yield* encodeJson({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: { name, arguments: args },
      });
      const found = yield* bindings;
      const response = yield* Effect.promise(() =>
        createMcpHandler(() => registerClaudeRequestTools(found)(serverOf())).fetch(
          mcpRequest(body),
          {
            authInfo: authInfoOf({ azp: client }),
          },
        ),
      );
      const text = yield* Effect.promise(() => response.text());
      const { result } = yield* decodeResult(payloadOf(text));
      const joined = pipe(
        result.content,
        Arr.map((item) => item.text),
        Arr.join("\n"),
      );
      return { isError: result.isError ?? false, text: joined };
    }).pipe(Effect.orDie);

export const value =
  (client: string) =>
  (name: string) =>
  (args: Args): Effect.Effect<unknown> =>
    call(client)(name)(args).pipe(
      Effect.flatMap(({ isError, text }) =>
        Bool.match(isError, {
          onTrue: () => Effect.die(text),
          onFalse: () => decodeJson(text).pipe(Effect.orDie),
        }),
      ),
    );
