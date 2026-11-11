import { describe, expect, it } from "@effect/vitest";

import { dueAt } from "./due.ts";

const SPOKE_AT = 10_000;
const TOO_SOON = 12_000;
const AFTER_SILENCE = 13_000;
const MUCH_LATER = 70_000;
const BEFORE_SUMMARY = 19_000;
const SUMMARY_DUE = 20_000;
const NOTHING_SUMMARIZED = -1;
const SILENCE_SECONDS = 2.5;
const SUMMARY_SECONDS = 20;
const MANUAL = 0;

const base = {
  now: AFTER_SILENCE,
  heard: {
    lastSpeechAt: SPOKE_AT,
    spokeSinceQuestion: true,
    lastSummaryAt: 0,
    summarizedThrough: NOTHING_SUMMARIZED,
  },
  settings: {
    strategy: "concrete",
    model: "haiku",
    compare: false,
    speak: true,
    silenceSeconds: SILENCE_SECONDS,
    summarySeconds: SUMMARY_SECONDS,
  },
  interim: "",
  listening: { status: "listening" },
  asking: { status: "idle" },
} as const;

describe("dueAt", () => {
  it("asks once the speaker has been quiet for the silence setting", () => {
    expect(dueAt({ ...base, now: TOO_SOON }).ask).toBe(false);
    expect(dueAt(base).ask).toBe(true);
  });

  it("does not ask while the speaker is mid-sentence", () => {
    expect(dueAt({ ...base, interim: "えっと" }).ask).toBe(false);
  });

  it("does not ask again before the speaker answers", () => {
    const heard = { ...base.heard, spokeSinceQuestion: false };
    expect(dueAt({ ...base, heard }).ask).toBe(false);
  });

  it("does not ask on its own when the silence setting is manual", () => {
    const settings = { ...base.settings, silenceSeconds: MANUAL };
    expect(dueAt({ ...base, now: MUCH_LATER, settings }).ask).toBe(false);
  });

  it("summarizes on the summary interval", () => {
    expect(dueAt({ ...base, now: BEFORE_SUMMARY }).summarize).toBe(false);
    expect(dueAt({ ...base, now: SUMMARY_DUE }).summarize).toBe(true);
  });
});
