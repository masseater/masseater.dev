import { describe, expect, it } from "@effect/vitest";

import { NUDGE, RECORD_TOOL, needsNudge } from "./analyst-nudge.ts";

const input = { role: "user", content: '{"sources":[]}' };

const nudged = { role: "user", content: NUDGE };

const done = { role: "assistant", content: [{ type: "text", text: "done" }] };

const recorded = {
  role: "assistant",
  content: [{ type: "toolCall", name: RECORD_TOOL, arguments: { observations: [] } }],
};

const result = { role: "toolResult", content: [{ type: "text", text: "recorded" }] };

describe("needsNudge", () => {
  it("記録を呼ばずに答えたら、もう一度だけ促す", () => {
    expect(needsNudge({ answer: done, newestFirst: [input] })).toBe(true);
  });

  it("この回で記録を呼んでいれば促さない", () => {
    expect(needsNudge({ answer: done, newestFirst: [result, recorded, input] })).toBe(false);
  });

  it("促したあとにまた呼ばなくても、二度は促さない", () => {
    expect(needsNudge({ answer: done, newestFirst: [nudged, done, input] })).toBe(false);
  });

  it("前の回の記録は、この回の呼び出しに数えない", () => {
    expect(needsNudge({ answer: done, newestFirst: [input, result, recorded] })).toBe(true);
  });
});
