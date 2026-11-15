import { describe, expect, it } from "vite-plus/test";

import { listRequestOf, readRequestOf } from "./conversation-input";

const SESSION = "6df4989a-c0a7-5129-89d5-965ab358d4fe";

describe("conversation_read の入力", () => {
  it("省いた値に既定を入れる", () => {
    expect(readRequestOf({ input: {}, sessionId: SESSION })).toStrictEqual({
      kind: "claude-code",
      sessionId: SESSION,
      file: SESSION,
      cursor: 0,
      maxBytes: 200_000,
      view: "raw",
    });
    expect(listRequestOf({})).toStrictEqual({ kind: "claude-code", limit: 20 });
  });

  it("渡した値をそのまま使う", () => {
    const input = {
      file: "subagents/agent-a1",
      cursor: 120,
      maxBytes: 5000,
      limit: 3,
      view: "owner" as const,
    };
    expect(readRequestOf({ input, sessionId: SESSION })).toStrictEqual({
      kind: "claude-code",
      sessionId: SESSION,
      file: "subagents/agent-a1",
      cursor: 120,
      maxBytes: 5000,
      view: "owner",
    });
    expect(listRequestOf(input)).toStrictEqual({ kind: "claude-code", limit: 3 });
  });
});
