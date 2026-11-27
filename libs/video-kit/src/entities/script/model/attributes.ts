import { Array as Arr, Option, Record as Rec, String as Str, pipe } from "effect";

import type { Format } from "#/shared/config/index.ts";
import { ONE } from "#/shared/config/index.ts";

import { secondsOf } from "./frontmatter.ts";

export interface Attributes {
  readonly id: Option.Option<string>;
  readonly only: Option.Option<Format>;
  readonly fixedSeconds: Option.Option<number>;
}

export const ATTRIBUTES = /\s*\{(?<body>[^}]*)\}\s*$/u;

const SPACES = /\s+/u;
const SECONDS = /^\d+(?:\.\d+)?s$/u;
const ID_MARK = "#";
const NO_TOKENS: readonly string[] = [];

const ONLY: Readonly<Record<string, Format>> = { 横のみ: "horizontal", 縦のみ: "vertical" };

const tokensOf = (raw: string): readonly string[] =>
  pipe(
    Option.fromNullishOr(ATTRIBUTES.exec(raw)),
    Option.flatMap(({ groups }) => Option.fromNullishOr(groups)),
    Option.flatMap((groups) => Rec.get(groups, "body")),
    Option.map((body) => pipe(Str.split(SPACES)(body), Arr.filter(Str.isNonEmpty))),
    Option.getOrElse(() => NO_TOKENS),
  );

export const attributesOf = (raw: string): Attributes => {
  const tokens = tokensOf(raw);
  return {
    id: pipe(tokens, Arr.findFirst(Str.startsWith(ID_MARK)), Option.map(Str.slice(ONE))),
    only: pipe(
      tokens,
      Arr.map((token) => Rec.get(ONLY, token)),
      Arr.getSomes,
      Arr.head,
    ),
    fixedSeconds: pipe(
      tokens,
      Arr.findFirst((token) => SECONDS.test(token)),
      Option.map(secondsOf),
    ),
  };
};
