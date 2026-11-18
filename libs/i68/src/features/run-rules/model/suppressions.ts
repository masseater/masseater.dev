import { Array as Arr, Match, Option, String as Str, pipe } from "effect";

const DIRECTIVE = /\/\/\s*i68-ignore(?<scope>-next-line|-file)?(?<rules>[^\n\r]*)/u;
const LINE_BREAK = /\r\n|\r|\n/u;
const LIST = /[\s,]+/u;
const FIRST_LINE = 1;
const NEXT = 1;

type Scope = "line" | "next-line" | "file";

interface Directive {
  readonly line: number;
  readonly scope: Scope;
  readonly rules: readonly string[];
}

const scopeOf = (text: string): Scope =>
  Match.value(text).pipe(
    Match.when("-file", (): Scope => "file"),
    Match.when("-next-line", (): Scope => "next-line"),
    Match.orElse((): Scope => "line"),
  );

const groupOf =
  (found: RegExpExecArray) =>
  (name: string): string =>
    pipe(
      Option.fromNullishOr(found.groups),
      Option.flatMap((groups) => Option.fromNullishOr(groups[name])),
      Option.getOrElse(() => ""),
    );

const directiveOf = (text: string, index: number): Option.Option<Directive> =>
  pipe(
    Option.fromNullishOr(DIRECTIVE.exec(text)),
    Option.map((found) => ({
      line: index + FIRST_LINE,
      scope: scopeOf(groupOf(found)("scope")),
      rules: pipe(Str.split(groupOf(found)("rules"), LIST), Arr.filter(Str.isNonEmpty)),
    })),
  );

const covers =
  (found: Suppressed) =>
  (directive: Directive): boolean =>
    (!Arr.isReadonlyArrayNonEmpty(directive.rules) || Arr.contains(directive.rules, found.rule)) &&
    Match.value(directive.scope).pipe(
      Match.when("file", () => true),
      Match.when("next-line", () => directive.line + NEXT === found.line),
      Match.orElse(() => directive.line === found.line),
    );

export interface Suppressed {
  readonly line: number;
  readonly rule: string;
}

export const suppressionsOf = (text: string): ((found: Suppressed) => boolean) => {
  const directives = pipe(Str.split(text, LINE_BREAK), Arr.map(directiveOf), Arr.getSomes);
  return (found) => pipe(directives, Arr.some(covers(found)));
};
