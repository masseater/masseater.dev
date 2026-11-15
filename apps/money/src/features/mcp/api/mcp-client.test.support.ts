import type { Caller } from "@masseater.dev/mcp-tool-call";
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

import { registerTools } from "./tools";

type Args = Readonly<Record<string, unknown>>;

type Called = Readonly<{ isError: boolean; text: string }>;

type Decodable = Schema.ConstraintDecoder<unknown> & Schema.Constraint;

const OWNER: Caller = { client: "claude-code", userAgent: "vitest" };

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
  new Request("https://money.masseater.dev/mcp", {
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

const respond = (body: string): Promise<Response> =>
  createMcpHandler(() => registerTools(OWNER)).fetch(mcpRequest(body));

const call =
  (name: string) =>
  (args: Args): Effect.Effect<Called> =>
    Effect.gen(function* called() {
      const body = yield* encodeJson({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: { name, arguments: args },
      });
      const response = yield* Effect.promise(() => respond(body));
      const text = yield* Effect.promise(() => response.text());
      const { result } = yield* decodeResult(payloadOf(text));
      const joined = pipe(
        result.content,
        Arr.map((item) => item.text),
        Arr.join("\n"),
      );
      return { isError: result.isError ?? false, text: joined };
    }).pipe(Effect.orDie);

const value =
  (name: string) =>
  (args: Args): Effect.Effect<unknown> =>
    call(name)(args).pipe(
      Effect.flatMap(({ isError, text }) =>
        Bool.match(isError, {
          onTrue: () => Effect.die(text),
          onFalse: () => decodeJson(text).pipe(Effect.orDie),
        }),
      ),
    );

const decoded =
  <Target extends Decodable>(schema: Target) =>
  (name: string) =>
  (args: Args): Effect.Effect<Target["Type"]> =>
    value(name)(args).pipe(Effect.flatMap(Schema.decodeUnknownEffect(schema)), Effect.orDie);

export { call, decoded, value };
