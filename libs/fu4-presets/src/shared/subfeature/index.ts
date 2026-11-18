import { Option, String as Str, pipe } from "effect";

const WHITESPACE = /\s/u;
const RUNS = /\s+/gu;
const SPECIAL = /[$()*+.?[\\\]^{|}]/gu;

export type Fragment =
  | { readonly type: "raw"; readonly text: string }
  | { readonly type: "pattern"; readonly pattern: RegExp };

export interface Span {
  readonly start: number;
  readonly end: number;
}

export interface Subfeature {
  readonly after: number;
  readonly fragment: Fragment;
}

const escaped = (text: string): string => Str.replaceAll(SPECIAL, String.raw`\$&`)(text);

export const fragmentOf = (text: string): Fragment => {
  if (!WHITESPACE.test(text)) {
    return { type: "raw", text };
  }
  return {
    type: "pattern",
    pattern: new RegExp(Str.replaceAll(RUNS, String.raw`\s+`)(escaped(text)), "u"),
  };
};

export const subfeatureOf =
  (after: number) =>
  (text: string): Subfeature => ({
    after,
    fragment: fragmentOf(text),
  });

const WHOLE = 0;

const found = (fragment: Fragment, focus: string): Option.Option<Span> => {
  if (fragment.type === "raw") {
    return pipe(
      Str.indexOf(fragment.text)(focus),
      Option.map((start) => ({ start, end: start + fragment.text.length })),
    );
  }
  return pipe(
    Option.fromNullishOr(fragment.pattern.exec(focus)),
    Option.map((match) => ({ start: match.index, end: match.index + match[WHOLE].length })),
  );
};

export const locateWithin =
  (subfeature: Subfeature) =>
  (feature: string): Option.Option<Span> =>
    pipe(
      found(subfeature.fragment, Str.slice(subfeature.after)(feature)),
      Option.map((span) => ({
        start: span.start + subfeature.after,
        end: span.end + subfeature.after,
      })),
    );

const START = 0;

export const subfeature = subfeatureOf(START);
