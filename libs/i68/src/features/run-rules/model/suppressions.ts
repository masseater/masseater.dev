import type { SourceComment } from "@r_masseater/fumx-parser";
import { Array as Arr, Match, Option, String as Str, pipe } from "effect";

const DIRECTIVE =
  /^i68-(?<kind>ignore-next-line|ignore-file|ignore|disable|enable)(?:\s(?<rest>[\s\S]*))?$/u;
const REASON = /\s-{2,}(?:\s|$)/u;
const LINE_MARK = "//";
const BLOCK_START = "/*";
const BLOCK_END = "*/";
const LIST = ",";
const NEXT = 1;
const LINE_START = 0;

type Kind = "ignore" | "ignore-next-line" | "ignore-file" | "disable" | "enable";

interface Directive {
  readonly line: number;
  readonly column: number;
  readonly kind: Kind;
  readonly rules: readonly string[];
}

export interface Suppressed {
  readonly line: number;
  readonly column?: number;
  readonly rule: string;
}

const kindOf = (text: string): Kind =>
  Match.value(text).pipe(
    Match.when("ignore-file", (): Kind => "ignore-file"),
    Match.when("ignore-next-line", (): Kind => "ignore-next-line"),
    Match.when("disable", (): Kind => "disable"),
    Match.when("enable", (): Kind => "enable"),
    Match.orElse((): Kind => "ignore"),
  );

const bodyOf = (text: string): string => {
  if (Str.startsWith(BLOCK_START)(text)) {
    return pipe(text, Str.slice(BLOCK_START.length), Str.replace(BLOCK_END, ""), Str.trim);
  }
  return pipe(text, Str.slice(LINE_MARK.length), Str.trim);
};

const rulesOf = (rest: string): readonly string[] =>
  pipe(
    Str.split(` ${rest}`, REASON),
    Arr.head,
    Option.getOrElse(() => ""),
    Str.split(LIST),
    Arr.map(Str.trim),
    Arr.filter(Str.isNonEmpty),
  );

const groupsOf = (text: string): Option.Option<Partial<Record<string, string>>> =>
  pipe(
    Option.fromNullishOr(DIRECTIVE.exec(text)),
    Option.flatMap((found) => Option.fromNullishOr(found.groups)),
  );

const directiveOf = (comment: SourceComment): Option.Option<Directive> =>
  pipe(
    groupsOf(bodyOf(comment.text)),
    Option.map((groups) => ({
      line: comment.line,
      column: comment.column,
      kind: kindOf(groups["kind"] ?? ""),
      rules: rulesOf(groups["rest"] ?? ""),
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

const isAfter =
  (found: Suppressed) =>
  (directive: Directive): boolean =>
    directive.line < found.line ||
    (directive.line === found.line && directive.column <= (found.column ?? LINE_START));

const insideRange =
  (directives: readonly Directive[]) =>
  (found: Suppressed): boolean =>
    pipe(
      directives,
      Arr.filter(
        (directive) =>
          isRange(directive) && isAfter(found)(directive) && names(found.rule)(directive),
      ),
      Arr.last,
      Option.exists((directive) => directive.kind === "disable"),
    );

export const suppressionsOf = (
  comments: readonly SourceComment[],
): ((found: Suppressed) => boolean) => {
  const directives = pipe(comments, Arr.map(directiveOf), Arr.getSomes);
  return (found) => pipe(directives, Arr.some(coversLine(found))) || insideRange(directives)(found);
};
