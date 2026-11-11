import { Array, Effect, Exit, Option, Predicate, Schema, pipe } from "effect";
import { RpcSerialization } from "effect/rpc";
import { expect, test } from "vite-plus/test";

import { RequestFailed } from "./request-failed.ts";
import { RpcCauseReason, RpcRequest, RpcResponse } from "./wire.ts";

const REQUEST_ID = 7;
const NOT_FOUND = "見つかりません";
const TRACE_ID = "0123456789abcdef0123456789abcdef";
const SPAN_ID = "0123456789abcdef";

const Sources = Schema.Struct({ sources: Schema.Array(Schema.String) });

const SourcesExit = Schema.toCodecJson(Schema.Exit(Sources, RequestFailed, Schema.Defect()));

const ReceivedRequest = Schema.TaggedStruct("Request", {
  id: Schema.Unknown,
  tag: Schema.String,
  payload: Schema.Unknown,
});

const isFail = Schema.is(Schema.TaggedStruct("Fail", { error: Schema.Unknown }));

const encodeRequest = Schema.encodeEffect(Schema.fromJsonString(RpcRequest));

const decodeReceived = Schema.decodeUnknownEffect(Schema.Array(ReceivedRequest));

const decodeResponse = Schema.decodeUnknownEffect(Schema.fromJsonString(RpcResponse));

const decodeReasons = Schema.decodeUnknownEffect(Schema.Array(RpcCauseReason));

const decodeFailed = Schema.decodeUnknownEffect(RequestFailed);

const encodeExit = Schema.encodeEffect(SourcesExit);

const sendFromCsharp = Effect.fn("sendFromCsharp")(function* sendFromCsharp(params: unknown) {
  const request = yield* encodeRequest({
    jsonrpc: "2.0",
    id: REQUEST_ID,
    method: "ListSources",
    params,
    traceId: TRACE_ID,
    spanId: SPAN_ID,
    sampled: true,
  });
  const decoded: unknown = RpcSerialization.jsonRpc().makeUnsafe().decode(request);
  return yield* decodeReceived(decoded);
});

const answerToCsharp = Effect.fn("answerToCsharp")(function* answerToCsharp(
  exit: Exit.Exit<typeof Sources.Type, RequestFailed>,
) {
  const received = yield* sendFromCsharp(Option.getOrNull(Option.none()));
  const { id } = yield* Effect.fromOption(Array.head(received));
  const encoded = yield* encodeExit(exit);
  const text: unknown = RpcSerialization.jsonRpc()
    .makeUnsafe()
    .encode({ _tag: "Exit", requestId: id, exit: encoded });
  return yield* decodeResponse(text);
});

test("サーバーが返す失敗を、C# が読む形の型で読み、RequestFailed まで取り出せる", () =>
  Effect.runPromise(
    Effect.gen(function* readsFailure() {
      const failure = RequestFailed.make({ reason: "NotFound", message: NOT_FOUND });
      const response = yield* answerToCsharp(Exit.fail(failure));
      const error = yield* Effect.fromNullishOr(response.error);
      const reasons = yield* decodeReasons(error.data);
      const fail = yield* Effect.fromOption(pipe(reasons, Array.findFirst(isFail)));
      const decoded = yield* decodeFailed(fail.error);
      expect({ id: response.id, cause: Predicate.isTagged(error, "Cause"), decoded }).toStrictEqual(
        { id: REQUEST_ID, cause: true, decoded: failure },
      );
    }),
  ));

test("サーバーが返す成功を、C# が読む形の型で読める", () =>
  Effect.runPromise(
    Effect.gen(function* readsSuccess() {
      const response = yield* answerToCsharp(Exit.succeed({ sources: [] }));
      expect(response).toStrictEqual({ jsonrpc: "2.0", id: REQUEST_ID, result: { sources: [] } });
    }),
  ));

test("C# が送る形の要求を、サーバーが RPC の要求として読む", () =>
  Effect.runPromise(
    Effect.gen(function* readsRequest() {
      const received = yield* sendFromCsharp({ id: REQUEST_ID });
      expect(received).toStrictEqual([
        { _tag: "Request", id: REQUEST_ID, tag: "ListSources", payload: { id: REQUEST_ID } },
      ]);
    }),
  ));
