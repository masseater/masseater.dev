import { Array as Arr, Equal, String as Str, pipe } from "effect";
import { expect, test } from "vite-plus/test";

import { EXAMPLES } from "./examples.ts";

type Injected = Extract<(typeof EXAMPLES)[number], { readonly kind: "injected" }>;

const isInjected = (example: (typeof EXAMPLES)[number]): example is Injected =>
  example.kind === "injected";

const answersIn = pipe(
  EXAMPLES,
  Arr.filter(isInjected),
  Arr.flatMap((example) =>
    pipe(
      example.answers,
      Arr.map((answer) => ({ answer, text: example.text })),
    ),
  ),
);

test("every answer appears once in its example", () => {
  expect(
    pipe(
      answersIn,
      Arr.filter(
        ({ answer, text }) =>
          !Str.includes(answer)(text) ||
          !Equal.equals(Str.indexOf(answer)(text), Str.lastIndexOf(answer)(text)),
      ),
    ),
  ).toStrictEqual([]);
});
