import { Effect, Schema } from "effect";
import { describe, expect, test } from "vite-plus/test";

import { relayBody, relayResponse, relayUrl } from "./request.ts";

const Json = Schema.fromJsonString(Schema.Unknown);
const decodeJson = Schema.decodeEffect(Json);
const encodeJson = Schema.encodeEffect(Json);

const ok = 200;
const badGateway = 502;

describe("relayBody", () => {
  test("ページの情報の前後の空白を除いて JSON にする", () =>
    Effect.runPromise(
      relayBody({
        url: "https://example.com/a",
        title: " 記事 ",
        highlight: " 選んだ文 ",
        focus: "",
      }).pipe(
        Effect.flatMap(decodeJson),
        Effect.tap((body) =>
          Effect.sync(() => {
            expect(body).toStrictEqual({
              url: "https://example.com/a",
              title: "記事",
              highlight: "選んだ文",
              focus: "",
            });
          }),
        ),
      ),
    ));
});

describe("relayResponse", () => {
  test("成功ならセッションの URL を返す", () =>
    Effect.runPromise(
      encodeJson({ sessionUrl: "https://claude.ai/code/session_01" }).pipe(
        Effect.tap((text) =>
          Effect.sync(() => {
            expect(relayResponse({ status: ok, finalUrl: relayUrl, text })).toStrictEqual({
              status: "started",
              sessionUrl: "https://claude.ai/code/session_01",
            });
          }),
        ),
      ),
    ));

  test("Access のログイン画面へ飛ばされたらログインを求める", () => {
    expect(
      relayResponse({
        status: ok,
        finalUrl: "https://team.cloudflareaccess.com/cdn-cgi/access/login",
        text: "<html></html>",
      }),
    ).toStrictEqual({ status: "login" });
  });

  test("失敗なら状態コードと本文を返す", () => {
    expect(relayResponse({ status: badGateway, finalUrl: relayUrl, text: "error" })).toStrictEqual({
      status: "failed",
      reason: "HTTP 502: error",
    });
  });
});
