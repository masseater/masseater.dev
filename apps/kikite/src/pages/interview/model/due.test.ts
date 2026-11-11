import { describe, expect, it } from "@effect/vitest";
import { Option } from "effect";

import type { Entry } from "./atoms.ts";
import { dueAt } from "./due.ts";

const OPENED_AT = 0;
const SPOKE_AT = 10_000;
const TOO_SOON = 12_000;
const BEFORE_NUDGE = 5000;
const AFTER_SILENCE = 13_000;
const BEFORE_SUMMARY = 19_000;
const SUMMARY_DUE = 20_000;
const FIRST_NUDGE = 10_000;
const SECOND_NUDGE = 30_000;
const ASKED_AT = 30_000;
const STALE = 45_000;
const NOTHING_SUMMARIZED = -1;
const NO_NUDGE = 0;
const FIRST = 1;
const SECOND = 2;

const SPEECH: Entry = { kind: "speech", id: 0, at: SPOKE_AT, text: "電車", by: "voice" };
const QUESTION: Entry = {
  kind: "question",
  id: 1,
  at: ASKED_AT,
  strategy: Option.none(),
  reason: "",
  question: "どこへ？",
  rating: "unrated",
};

const base = {
  now: AFTER_SILENCE,
  heard: {
    lastActivityAt: SPOKE_AT,
    spokeSinceQuestion: true,
    lastInput: "voice",
    lastSummaryAt: 0,
    summarizedThrough: NOTHING_SUMMARIZED,
    withdrawn: 0,
  },
  entries: [SPEECH],
  interim: "",
  typing: "",
  hearing: false,
  listening: { status: "listening" },
  asking: { status: "idle" },
} as const;

const opened = {
  ...base,
  heard: { ...base.heard, lastActivityAt: OPENED_AT, spokeSinceQuestion: false },
  entries: [],
} as const;

describe("dueAt", () => {
  it("asks once the speaker has been quiet for a moment", () => {
    expect(dueAt({ ...base, now: TOO_SOON }).ask).toBe(false);
    expect(dueAt(base).ask).toBe(true);
  });

  it("does not ask while the speaker is mid-sentence or typing", () => {
    expect(dueAt({ ...base, interim: "えっと" }).ask).toBe(false);
    expect(dueAt({ ...base, typing: "電" }).ask).toBe(false);
  });

  it("does not ask again before the speaker answers", () => {
    const heard = { ...base.heard, spokeSinceQuestion: false };
    expect(dueAt({ ...base, heard }).ask).toBe(false);
  });

  it("summarizes on the summary interval", () => {
    expect(dueAt({ ...base, now: BEFORE_SUMMARY }).summarize).toBe(false);
    expect(dueAt({ ...base, now: SUMMARY_DUE }).summarize).toBe(true);
  });

  it("nudges after 10 and 30 seconds of silence before anything is said", () => {
    expect(dueAt({ ...opened, now: BEFORE_NUDGE }).nudge).toBe(NO_NUDGE);
    expect(dueAt({ ...opened, now: FIRST_NUDGE }).nudge).toBe(FIRST);
    expect(dueAt({ ...opened, now: SECOND_NUDGE }).nudge).toBe(SECOND);
  });

  it("stops nudging once the speaker has said something", () => {
    expect(dueAt({ ...base, now: SECOND_NUDGE }).nudge).toBe(NO_NUDGE);
  });

  it("fades a question nobody answered after 15 seconds", () => {
    const heard = { ...base.heard, spokeSinceQuestion: false };
    const asked = { ...base, heard, entries: [SPEECH, QUESTION] };
    expect(dueAt({ ...asked, now: ASKED_AT }).stale).toBe(false);
    expect(dueAt({ ...asked, now: STALE }).stale).toBe(true);
    expect(dueAt({ ...asked, now: STALE, typing: "平日" }).stale).toBe(false);
    expect(dueAt({ ...asked, now: STALE, hearing: true }).stale).toBe(false);
  });
});
