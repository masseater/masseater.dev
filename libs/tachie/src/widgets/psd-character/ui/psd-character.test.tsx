import { describe, expect, it } from "@effect/vitest";
import { Thumbnail } from "@remotion/player";
import { Effect } from "effect";
import type { ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { page } from "vite-plus/test/browser";

import { parseLab } from "#/entities/phonemes/index.ts";
import { CHARACTER_FAVORITES, characterBytes } from "#/shared/lib/character.test.support.ts";
import type { Part, Voice } from "#/widgets/psd-character/index.ts";

import { PsdCharacter } from "./psd-character.tsx";

const SIZE = 64;
const FPS = 30;
const DURATION = 60;
const BLINKING = 1;

const psd = URL.createObjectURL(new Blob([characterBytes()]));
const favorites = URL.createObjectURL(new Blob([CHARACTER_FAVORITES]));
const phonemes = parseLab("0 1000000 a");

const PARTS: readonly Part[] = [
  "F.お気に入り/困り顔",
  { kind: "blink", closed: "v1.!目/*閉じ", half: "v1.!目/*半目", open: "v1.!目/*開き" },
  {
    kind: "vowel-mouth",
    vowelA: "v1.!口/*あ",
    vowelI: "v1.!口/*い",
    vowelU: "v1.!口/*う",
    vowelE: "v1.!口/*え",
    vowelO: "v1.!口/*お",
    closed: "v1.!口/*ん",
  },
];
const VOICES: readonly Voice[] = [{ from: 0, phonemes }];

const Scene = (): ReactNode => (
  <PsdCharacter favorites={favorites} parts={PARTS} psd={psd} voices={VOICES} />
);

const mount = (): HTMLElement => {
  const host = document.createElement("div");
  host.style.width = `${String(SIZE)}px`;
  document.body.replaceChildren(host);
  createRoot(host).render(
    <Thumbnail
      component={Scene}
      compositionHeight={SIZE}
      compositionWidth={SIZE}
      durationInFrames={DURATION}
      fps={FPS}
      frameToDisplay={BLINKING}
    />,
  );
  return host;
};

const canvasIn = (host: HTMLElement): Effect.Effect<HTMLCanvasElement> =>
  Effect.promise(() =>
    expect.poll(() => host.querySelector("canvas")).toBeInstanceOf(HTMLCanvasElement),
  ).pipe(Effect.map(() => host.querySelector("canvas") ?? document.createElement("canvas")));

describe("PsdCharacter", () => {
  it.live("draws the favorite with closed eyes and an open mouth while speaking", () =>
    Effect.gen(function* test() {
      const canvas = yield* canvasIn(mount());
      yield* Effect.promise(() =>
        expect(page.elementLocator(canvas)).toMatchScreenshot("speaking-and-blinking"),
      );
    }),
  );
});
