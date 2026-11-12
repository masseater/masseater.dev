import { Effect } from "effect";
import { expect, test } from "vite-plus/test";

import { awaitEndpoint } from "./endpoint.ts";

test("エンドポイントファイルのポートとトークンから接続先の URL を作る", () =>
  Effect.runPromise(
    Effect.gen(function* buildsUrl() {
      const url = yield* awaitEndpoint(Effect.succeed('{"port":49152,"token":"a b&c"}'));
      expect(url).toBe("ws://127.0.0.1:49152/?token=a%20b%26c");
    }),
  ));
