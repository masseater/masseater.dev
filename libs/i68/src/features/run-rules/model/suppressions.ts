import { Array as Arr, Match, Option, String as Str, pipe } from "effect";

const DIRECTIVE =
  /\/\/\s*i68-(?<kind>ignore-next-line|ignore-file|ignore|disable|enable)(?<rules>[^\n\r]*)/u;
const REASON = /\s--\s.*$|\s--$/u;
const LINE_BREAK = /\r\n|\r|\n/u;
const LIST = /[\s,]+/u;
const FIRST_LINE = 1;
const NEXT = 1;

type Kind = "ignore" | "ignore-next-line" | "ignore-file" | "disable" | "enable";

interface Directive {
  readonly line: number;
  readonly kind: Kind;
  readonly rules: readonly string[];
}

const kindOf = (text: string): Kind =>
  Match.value(text).pipe(
    Match.when("ignore-file", (): Kind => "ignore-file"),
    Match.when("ignore-next-line", (): Kind => "ignore-next-line"),
    Match.when("disable", (): Kind => "disable"),
    Match.when("enable", (): Kind => "enable"),
    Match.orElse((): Kind => "ignore"),
  );

const groupOf =
  (found: RegExpExecArray) =>
  (name: string): string =>
    pipe(
      Option.fromNullishOr(found.groups),
      Option.flatMap((groups) => Option.fromNullishOr(groups[name])),
      Option.getOrElse(() => ""),
    );

const rulesOf = (text: string): readonly string[] =>
  pipe(Str.replace(REASON, "")(` ${text}`), Str.split(LIST), Arr.filter(Str.isNonEmpty));

const directiveOf = (text: string, index: number): Option.Option<Directive> =>
  pipe(
    Option.fromNullishOr(DIRECTIVE.exec(text)),
    Option.map((found) => ({
      line: index + FIRST_LINE,
      kind: kindOf(groupOf(found)("kind")),
      rules: rulesOf(groupOf(found)("rules")),
    })),
  );

const names =
  (rule: string) =>
  (directive: Directive): boolean =>
    !Arr.isReadonlyArrayNonEmpty(directive.rules) || Arr.contains(directive.rules, rule);

const isRange = (directive: Directive): boolean =>
  directive.kind === "disable" || directive.kind === "enable";

const coversLine =
  (found: Suppressed) =>
  (directive: Directive): boolean =>
    names(found.rule)(directive) &&
    Match.value(directive.kind).pipe(
      Match.when("ignore-file", () => true),
      Match.when("ignore-next-line", () => directive.line + NEXT === found.line),
      Match.when("ignore", () => directive.line === found.line),
      Match.orElse(() => false),
    );

const insideRange =
  (directives: readonly Directive[]) =>
  (found: Suppressed): boolean =>
    pipe(
      directives,
      Arr.filter(
        (directive) =>
          isRange(directive) && directive.line <= found.line && names(found.rule)(directive),
      ),
      Arr.last,
      Option.exists((directive) => directive.kind === "disable"),
    );

export interface Suppressed {
  readonly line: number;
  readonly rule: string;
}

export const suppressionsOf = (text: string): ((found: Suppressed) => boolean) => {
  const directives = pipe(Str.split(text, LINE_BREAK), Arr.map(directiveOf), Arr.getSomes);
  return (found) => pipe(directives, Arr.some(coversLine(found))) || insideRange(directives)(found);
};
