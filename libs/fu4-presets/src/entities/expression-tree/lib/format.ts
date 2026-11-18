import { Array as Arr, Option, String as Str, pipe } from "effect";

import type { Evaluation } from "#/entities/expression-tree/model/types.ts";

import { display } from "./evaluation.ts";

interface Template {
  readonly text: string;
  readonly args: readonly Evaluation[];
}

interface Step {
  readonly text: string;
  readonly next: number;
}

const START = 0;
const NEXT = 1;
const PAIR = 2;
const BRACE = /[{}]/u;
const DIGITS = /^\d+/u;
const ESCAPES = new Set(["{{", "}}"]);

const after =
  (from: number) =>
  (found: Option.Option<number>): Option.Option<number> =>
    pipe(
      found,
      Option.map((at) => at + from),
    );

const nextBrace =
  (text: string) =>
  (from: number): Option.Option<number> =>
    pipe(Str.slice(from)(text), Str.search(BRACE), after(from));

const closeAfter =
  (text: string) =>
  (open: number): Option.Option<number> =>
    pipe(Str.slice(open + NEXT)(text), Str.indexOf("}"), after(open + NEXT));

const escaped =
  (text: string) =>
  (at: number): Option.Option<Step> =>
    pipe(
      Option.liftPredicate(Str.slice(at, at + PAIR)(text), (pair) => ESCAPES.has(pair)),
      Option.map((pair) => ({ text: Str.slice(NEXT)(pair), next: at + PAIR })),
    );

const argumentAt =
  (template: Template) =>
  (open: number): Option.Option<Step> =>
    Option.gen(function* parse() {
      const close = yield* Option.filter(closeAfter(template.text)(open), (at) => at > open + NEXT);
      const [digits] = yield* Option.fromNullishOr(
        DIGITS.exec(Str.slice(open + NEXT)(template.text)),
      );
      const value = yield* Arr.get(template.args, Number(digits) + NEXT);
      return { text: display(value), next: close + NEXT };
    });

const stepAt =
  (template: Template) =>
  (brace: number): Option.Option<Step> => {
    const escape = escaped(template.text)(brace);
    if (Str.startsWith("}", brace)(template.text)) {
      return escape;
    }
    return Option.orElse(escape, () => argumentAt(template)(brace));
  };

const formatFrom =
  (template: Template) =>
  (from: number, done: string): Option.Option<string> => {
    const brace = nextBrace(template.text)(from);
    if (Option.isNone(brace)) {
      return Option.some(done + Str.slice(from)(template.text));
    }
    const before = done + Str.slice(from, brace.value)(template.text);
    return pipe(
      stepAt(template)(brace.value),
      Option.flatMap((step) => formatFrom(template)(step.next, before + step.text)),
    );
  };

export const formatTemplate = (args: readonly Evaluation[]): Option.Option<string> =>
  Option.flatMap(Arr.head(args), (first) => formatFrom({ text: display(first), args })(START, ""));
