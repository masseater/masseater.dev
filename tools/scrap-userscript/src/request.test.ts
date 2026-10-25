import { Option } from "effect";
import { describe, expect, test } from "vite-plus/test";

import { decodeSettings, fireBody, fireHeaders, fireResponse } from "./request.ts";

const fireUrl = "https://api.anthropic.com/v1/claude_code/routines/trig_01ABCdef/fire";
const ok = 200;
const unauthorized = 401;

describe("decodeSettings", () => {
  test("ルーチンの fire エンドポイントとトークンを前後の空白を除いて受ける", () => {
    expect(decodeSettings({ fireUrl: ` ${fireUrl} `, token: " sk-ant-oat01-x " })).toStrictEqual(
      Option.some({ fireUrl, token: "sk-ant-oat01-x" }),
    );
  });

  test("ほかのホストや http の URL は受けない", () => {
    expect(
      decodeSettings({
        fireUrl: "https://example.com/v1/claude_code/routines/trig_01/fire",
        token: "t",
      }),
    ).toStrictEqual(Option.none());
    expect(
      decodeSettings({
        fireUrl: "http://api.anthropic.com/v1/claude_code/routines/trig_01ABCdef/fire",
        token: "t",
      }),
    ).toStrictEqual(Option.none());
  });

  test("空のトークンは受けない", () => {
    expect(decodeSettings({ fireUrl, token: "  " })).toStrictEqual(Option.none());
  });
});

describe("fireBody", () => {
  test("ページの情報を JSON の文字列にして text に入れる", () => {
    expect(
      JSON.parse(
        fireBody({
          url: "https://example.com/a",
          title: " 記事 ",
          highlight: " 選んだ文 ",
          focus: "",
        }),
      ),
    ).toStrictEqual({
      text: JSON.stringify({
        url: "https://example.com/a",
        title: "記事",
        highlight: "選んだ文",
        focus: "",
      }),
    });
  });
});

describe("fireHeaders", () => {
  test("トークンを Bearer で渡し、ベータのヘッダーを付ける", () => {
    expect(fireHeaders({ fireUrl, token: "sk-ant-oat01-x" })).toMatchObject({
      authorization: "Bearer sk-ant-oat01-x",
      "anthropic-beta": "experimental-cc-routine-2026-04-01",
    });
  });
});

describe("fireResponse", () => {
  test("成功ならセッションの URL を返す", () => {
    expect(
      fireResponse({
        status: ok,
        text: JSON.stringify({
          type: "routine_fire",
          claude_code_session_url: "https://claude.ai/code/session_01",
        }),
      }),
    ).toStrictEqual({ status: "started", sessionUrl: "https://claude.ai/code/session_01" });
  });

  test("失敗なら状態コードと本文を返す", () => {
    expect(fireResponse({ status: unauthorized, text: "unauthorized" })).toStrictEqual({
      status: "failed",
      reason: "HTTP 401: unauthorized",
    });
  });
});
