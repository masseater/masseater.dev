import { describe, expect, it } from "@effect/vitest";
import { Array as Arr, Option } from "effect";

import { parseLab } from "#/entities/phonemes/index.ts";

import { vowelMouthState } from "./vowel-mouth.ts";
import type { ConsonantMode, VowelMouth } from "./vowel-mouth.ts";

const FPS = 100;
const phonemes = parseLab(
  Arr.join("\n")([
    "0 1000000 pau",
    "1000000 2000000 k",
    "2000000 3000000 a",
    "3000000 4000000 m",
    "4000000 5000000 i",
    "5000000 6000000 pau",
  ]),
);

const mouth: VowelMouth = {
  kind: "vowel-mouth",
  vowelA: "あ",
  vowelI: "い",
  vowelU: "う",
  vowelE: "え",
  vowelO: "お",
  closed: "ん",
};

const shapeAt = ({
  frame,
  consonant,
}: Readonly<{ frame: number; consonant: ConsonantMode }>): string =>
  vowelMouthState({
    mouth: { ...mouth, consonant },
    speech: Option.some({ frame, fps: FPS, phonemes, audio: Option.none() }),
  });

describe("vowelMouthState vowels", () => {
  it("opens the mouth to the vowel being spoken", () => {
    expect(shapeAt({ frame: 25, consonant: "close" })).toBe("あ");
  });

  it("closes the mouth outside the phonemes when there is no voice", () => {
    expect(shapeAt({ frame: 70, consonant: "close" })).toBe("ん");
  });

  it("leaves the mouth alone when nobody speaks", () => {
    expect(vowelMouthState({ mouth, speech: Option.none() })).toBe("");
  });

  it("closes the mouth when nobody speaks and it always applies", () => {
    expect(vowelMouthState({ mouth: { ...mouth, alwaysApply: true }, speech: Option.none() })).toBe(
      "ん",
    );
  });
});

describe("vowelMouthState consonants", () => {
  it("closes on a consonant in close mode", () => {
    expect(shapeAt({ frame: 15, consonant: "close" })).toBe("ん");
  });

  it("keeps the previous vowel in hold mode", () => {
    expect(shapeAt({ frame: 35, consonant: "hold" })).toBe("あ");
  });

  it("narrows toward the next vowel in blend mode", () => {
    expect(shapeAt({ frame: 18, consonant: "blend" })).toBe("お");
  });

  it("closes the lips on a bilabial in blend mode", () => {
    expect(shapeAt({ frame: 35, consonant: "blend" })).toBe("ん");
  });

  it("shapes the mouth for the consonant in articulate mode", () => {
    expect(shapeAt({ frame: 15, consonant: "articulate" })).toBe("う");
  });
});
