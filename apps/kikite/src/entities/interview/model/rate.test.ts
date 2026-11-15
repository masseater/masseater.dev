import { describe, expect, it } from "@effect/vitest";
import { Option } from "effect";

import type { Entry } from "./atoms.ts";
import { rated } from "./rate.ts";

const QUESTION_ID = 1;

const SPEECH: Entry = { kind: "speech", id: 0, at: 0, text: "", by: "voice" };
const QUESTION: Entry = {
  kind: "question",
  id: QUESTION_ID,
  at: 0,
  strategy: Option.some("concrete"),
  reason: "",
  question: "",
  rating: "unrated",
};

describe("rated", () => {
  it("rates only the question with the id", () => {
    expect(rated({ id: QUESTION_ID, rating: "good" })([SPEECH, QUESTION])).toStrictEqual([
      SPEECH,
      { ...QUESTION, rating: "good" },
    ]);
  });

  it("clears the rating when the same one is chosen again", () => {
    const off = rated({ id: QUESTION_ID, rating: "off" });
    expect(off(off([SPEECH, QUESTION]))).toStrictEqual([SPEECH, QUESTION]);
  });

  it("leaves speech alone", () => {
    expect(rated({ id: 0, rating: "good" })([SPEECH])).toStrictEqual([SPEECH]);
  });
});
