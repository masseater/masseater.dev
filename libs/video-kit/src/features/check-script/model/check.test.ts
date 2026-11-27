import { Array as Arr, Effect, Option, String as Str, pipe } from "effect";
import { expect, test } from "vite-plus/test";

import { parseScript, planTimeline } from "#/entities/script/index.ts";
import type { ScriptError } from "#/entities/script/index.ts";

import { checkScript } from "./check.ts";

const SHORT_SCENES = 5;
const LONG_LINE = 30;
const TOO_LONG_CAPTION = 40;

const issuesOf = (markdown: string): Effect.Effect<readonly string[], ScriptError> =>
  Effect.gen(function* check() {
    const script = yield* parseScript(markdown);
    const timeline = yield* planTimeline({
      script,
      format: "vertical",
      sources: {
        narration: {},
        narrationSrc: (key: string) => key,
        assetSrc: (url: string) => url,
        speakerName: Option.none(),
      },
    });
    return pipe(
      checkScript({ script, timelines: [timeline], assetExists: () => true }),
      Arr.map(({ message }) => message),
    );
  });

const scriptOf = ({ body, length }: Readonly<{ body: string; length: string }>): string =>
  `---\ntitle: t\nformats: [vertical]\nlength: { vertical: ${length} }\nvoice: none\n---\n\n# 題名 {#opening}\n\n${body}\n\n# 締め {#ending}\n`;

const run = (body: Effect.Effect<void, ScriptError>): Promise<void> => Effect.runPromise(body);

const NO_ISSUES: readonly string[] = [];
const SETTINGS_ONLY =
  "---\ntitle: t\nvoice: none\n---\n\n# 題名 {#opening}\n\n## 話 {#a}\n\n短い。\n";

const sceneOf = (position: number): string =>
  `## 話 ${String(position)} {#s${String(position)}}\n\n${Str.repeat(LONG_LINE)("あ")}。`;

test("型どおりの短い台本は通る", () =>
  run(
    Effect.gen(function* passes() {
      const issues = yield* issuesOf(
        scriptOf({ body: "## 結論 {#summary}\n\n短く言う。", length: "50s" }),
      );
      expect(issues).toStrictEqual(NO_ISSUES);
    }),
  ));

test("目標の長さを 10% 超えると止まる", () =>
  run(
    Effect.gen(function* tooLong() {
      const body = pipe(Arr.makeBy(SHORT_SCENES, sceneOf), Arr.join("\n\n"));
      const issues = yield* issuesOf(scriptOf({ body, length: "10s" }));
      expect(issues).toContainEqual(expect.stringContaining("目標 10 秒"));
    }),
  ));

test("縦の字幕が 2 行に収まらないと止まる", () =>
  run(
    Effect.gen(function* longCaption() {
      const caption = Str.repeat(TOO_LONG_CAPTION)("い");
      const issues = yield* issuesOf(
        scriptOf({ body: `## 長い {#long}\n\n${caption}`, length: "50s" }),
      );
      expect(issues).toContainEqual(expect.stringContaining("32 文字"));
    }),
  ));

test("締めがない台本は止まる", () =>
  run(
    Effect.gen(function* noEnding() {
      const issues = yield* issuesOf(SETTINGS_ONLY);
      expect(issues).toContainEqual(expect.stringContaining("締め"));
    }),
  ));
