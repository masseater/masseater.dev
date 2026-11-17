import { TextlintKernelDescriptor } from "@textlint/kernel";
import type { TextlintMessage } from "@textlint/types";
import { Array as Arr, Effect, pipe } from "effect";
import { createLinter } from "textlint";
import { builtInPlugins } from "textlint/lib/src/loader/TextlintrcLoader.js";
import { describe, expect, test } from "vite-plus/test";

import { noTaigendome } from "./no-taigendome.ts";

const MARKDOWN = "doc.md";
const SECOND_PARAGRAPH_LINE = 3;
const linter = createLinter({
  descriptor: new TextlintKernelDescriptor({
    rules: [{ ruleId: "no-taigendome", rule: noTaigendome, options: true }],
    filterRules: [],
    plugins: [...builtInPlugins],
  }),
});

const messagesOf = (text: string): Effect.Effect<readonly TextlintMessage[]> =>
  Effect.promise(() => linter.lintText(text, MARKDOWN)).pipe(
    Effect.map((result) => result.messages),
  );

const check = <Value>(found: Effect.Effect<Value>, assert: (value: Value) => void): Promise<void> =>
  Effect.runPromise(found.pipe(Effect.map(assert)));

const textsOf = (text: string): Effect.Effect<readonly string[]> =>
  messagesOf(text).pipe(
    Effect.map((messages) =>
      pipe(
        messages,
        Arr.map((message) => message.message),
      ),
    ),
  );

describe("no-taigendome", () => {
  test.each([
    ["ボトルネック、人のやり取り。\n"],
    ["## 課題、速度\n"],
    ["設定を変えた（理由、互換性）。\n"],
  ])("flags %j", (text) =>
    check(textsOf(text), (messages) => {
      expect(messages).toStrictEqual([expect.stringContaining("体言止め")]);
    }),
  );

  test.each([
    ["ボトルネックは人のやり取りだった。\n"],
    ["速さ、軽さ、静けさを、\n"],
    ["設定を変えたので、再起動した。\n"],
    ["[手順、詳細](https://example.com/a,b) を読んだ。\n"],
    ["人は、考える。\n"],
  ])("leaves %j alone in Markdown", (text) =>
    check(textsOf(text), (messages) => {
      expect(messages).toStrictEqual([]);
    }),
  );

  test("reports the line of the sentence", () =>
    check(messagesOf("最初の文はここで終わる。\n\n次の段落、まとめ。\n"), (messages) => {
      expect(
        pipe(
          messages,
          Arr.map((message) => message.loc.start.line),
        ),
      ).toStrictEqual([SECOND_PARAGRAPH_LINE]);
    }));
});
