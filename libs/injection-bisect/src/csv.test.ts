import { Effect, String as Str, Array as Arr, pipe } from "effect";
import { expect, test } from "vite-plus/test";

import { INJECTION, cleanedOf } from "./__tests__/fake-judge.ts";
import { sentencesOf } from "./segment.ts";

const textsOf = (text: string, format: string): readonly string[] =>
  pipe(
    sentencesOf({ text, format }),
    Arr.map(({ start, end }) => Str.slice(start, end)(text)),
  );

test("reads CSV fields that look like prose, quoted or not", () => {
  expect(
    textsOf(
      'id,name,comment\n1,佐藤,"とても良い, また買う"\n2,abc,"彼は""最高""と言った"\n',
      "csv",
    ),
  ).toStrictEqual(["佐藤", "とても良い, また買う", '彼は""最高""と言った']);
});

test("reads TSV fields", () => {
  expect(textsOf("id\tcomment\n1\t良い商品です。\n", "tsv")).toStrictEqual(["良い商品です。"]);
});

test("finds and removes an injection in a review column", () =>
  Effect.runPromise(
    Effect.gen(function* review() {
      const text = `id,rating,review\n1,5,"届くのが早かった。"\n2,1,"${INJECTION}"\n`;
      const actual = yield* cleanedOf({ text, format: "csv" });
      expect(actual).toStrictEqual({
        found: [INJECTION],
        cleaned: Str.replace(INJECTION, "")(text),
      });
    }),
  ));
