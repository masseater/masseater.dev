import { Option, Schema } from "effect";
import { describe, expect, it } from "vite-plus/test";

import { ChunkQuery, FileQuery, TokenRequest } from "./conversation-query";

const SESSION = "6df4989a-c0a7-5129-89d5-965ab358d4fe";

const chunk = {
  kind: "claude-code",
  session: SESSION,
  file: SESSION,
  start: "0",
  end: "120",
  redactions: "2",
  cwd: "/home/user",
  source: "claude-code-cloud",
  remoteSession: "cse_016oXHvbRuDsuwvKb5awn1Je",
};

const decodeChunk = Schema.decodeUnknownOption(ChunkQuery);

const decodeFile = Schema.decodeUnknownOption(FileQuery);

describe("会話履歴の受け口の入力", () => {
  it("CLI が送る形の範囲を数値にして受け取る", () => {
    expect(decodeChunk(chunk)).toStrictEqual(
      Option.some({ ...chunk, start: 0, end: 120, redactions: 2 }),
    );
  });

  it("subagent のファイル名を受け取る", () => {
    expect(
      Option.isSome(
        decodeFile({ kind: "claude-code", session: SESSION, file: "subagents/agent-a1b2" }),
      ),
    ).toBe(true);
  });

  it.each(["../etc/passwd", "subagents/../../x", "a/b", "", "subagents/"])(
    "保存先のキーを壊すファイル名 %s を拒む",
    (file) => {
      expect(Option.isNone(decodeFile({ kind: "claude-code", session: SESSION, file }))).toBe(true);
    },
  );

  it.each(["-1", "1.5", "abc"])("位置 %s を拒む", (start) => {
    expect(Option.isNone(decodeChunk({ ...chunk, start }))).toBe(true);
  });

  it("知らない kind を拒む", () => {
    expect(Option.isNone(decodeChunk({ ...chunk, kind: "codex" }))).toBe(true);
  });

  it("トークンの発行は決まった scope だけを受け取る", () => {
    const decode = Schema.decodeUnknownOption(TokenRequest);
    expect(Option.isSome(decode('{"scope":"conversation:write","label":"cloud"}'))).toBe(true);
    expect(Option.isNone(decode('{"scope":"admin","label":"x"}'))).toBe(true);
  });
});
