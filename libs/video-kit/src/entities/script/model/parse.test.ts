import { Array as Arr, Effect, Option, String as Str, pipe } from "effect";
import { expect, test } from "vite-plus/test";

import { parseScript } from "./parse.ts";
import type { ScriptError } from "./script-error.ts";
import type { Scene } from "./script.ts";
import { textOf } from "./script.ts";

const QUOTE = "> 楽譜はコードだ\n> — 誰か\n";
const FIXED_SECONDS = 6;
const QUOTE_LINE = 44;
const STORE = 1;
const USAGE = 2;
const RATING = 4;

const SCRIPT = `---
title: pnpm ってなに？
formats: [vertical]
readings:
  pnpm: ピーエヌピーエム
---

# **pnpm** ってなに？ {#opening}

- 2016年〜
- OSS

速いパッケージマネージャー

## なぜ速いのか {#store 6s}

- 本体は 1 つだけ
- リンクするだけ

速さの理由はこの **2 つ**。

## 使い方 {#usage 横のみ}

\`\`\`
$ pnpm install
\`\`\`

\`pnpm add\` で足す。

## 画面 {#screen}

![エディタ](videos/editor.png)

## おすすめ度 {#rating}

★★★★☆

星 4 つ。

## 引用 {#quote}

![エディタ](videos/editor.png)

${QUOTE}
# また次の動画で {#ending}
`;

const VALID = Str.replace(`![エディタ](videos/editor.png)\n\n${QUOTE}`, QUOTE)(SCRIPT);

const SCORE = 4;
const MAX = 5;

const scenesOf = (markdown: string): Effect.Effect<readonly Scene[], ScriptError> =>
  parseScript(markdown).pipe(Effect.map(({ scenes }) => scenes));

const sceneAt = (position: number): Effect.Effect<Option.Option<Scene>, ScriptError> =>
  scenesOf(VALID).pipe(Effect.map((scenes) => Arr.get(scenes, position)));

const run = <Failure>(body: Effect.Effect<void, Failure>): Promise<void> => Effect.runPromise(body);

test("見出しの並びがシーンになる", () =>
  run(
    Effect.gen(function* order() {
      const scenes = yield* scenesOf(VALID);
      const kinds = pipe(
        scenes,
        Arr.map(({ id, kind }) => [id, kind]),
      );
      expect(kinds).toStrictEqual([
        ["opening", "title"],
        ["store", "points"],
        ["usage", "code"],
        ["screen", "media"],
        ["rating", "rating"],
        ["quote", "quote"],
        ["ending", "ending"],
      ]);
    }),
  ));

test("箇条書きは画面にだけ出て、段落がナレーションになる", () =>
  run(
    Effect.gen(function* points() {
      const store = yield* sceneAt(STORE);
      const lines = pipe(
        Option.toArray(store),
        Arr.flatMap(({ lines: all }) => all),
        Arr.map((line) => [textOf(line), line.caption]),
      );
      expect(lines).toStrictEqual([["速さの理由はこの 2 つ。", true]]);
      expect(Option.getOrThrow(store)).toMatchObject({
        kind: "points",
        fixedSeconds: FIXED_SECONDS,
      });
    }),
  ));

test("太字は強調の区切りとして残る", () =>
  run(
    Effect.gen(function* emphasis() {
      const store = yield* sceneAt(STORE);
      const segments = pipe(
        Option.toArray(store),
        Arr.flatMap(({ lines }) => lines),
        Arr.flatMap(({ segments: all }) => all),
      );
      expect(segments).toContainEqual({ text: "2 つ", code: false, emphasis: true });
    }),
  ));

test("横のみのシーンは横にだけ入る", () =>
  run(
    Effect.gen(function* only() {
      const usage = yield* sceneAt(USAGE);
      const store = yield* sceneAt(STORE);
      expect(Option.getOrThrow(usage).formats).toStrictEqual(["horizontal"]);
      expect(Option.getOrThrow(store).formats).toStrictEqual(["vertical"]);
    }),
  ));

test("星だけの段落はおすすめ度になる", () =>
  run(
    Effect.gen(function* rating() {
      const scene = yield* sceneAt(RATING);
      expect(Option.getOrThrow(scene)).toMatchObject({ kind: "rating", score: SCORE, max: MAX });
    }),
  ));

test("1 つのシーンに素材と引用を両方書くと行番号付きで止まる", () =>
  run(
    Effect.gen(function* twoBodies() {
      const failure = yield* parseScript(SCRIPT).pipe(Effect.flip);
      expect(failure.line).toBe(QUOTE_LINE);
    }),
  ));

test("設定がない台本は止まる", () =>
  run(
    Effect.gen(function* noSettings() {
      const failure = yield* parseScript("# 題名\n").pipe(Effect.flip);
      expect(failure.message).toContain("設定");
    }),
  ));
