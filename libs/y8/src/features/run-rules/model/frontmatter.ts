import { Option, Predicate, Record as Rec, pipe } from "effect";
import { parse } from "yaml";

import type { Frontmatter } from "#/shared/config/index.ts";

const BLOCK = /^---\r?\n(?<body>[\s\S]*?)\r?\n---(?:\r?\n|$)/u;

const parsed = (body: string): Option.Option<unknown> =>
  Option.liftThrowable((): unknown => parse(body))();

export const frontmatterOf = (text: string): Frontmatter | undefined =>
  pipe(
    Option.fromNullishOr(BLOCK.exec(text)),
    Option.flatMap((match) => Option.fromNullishOr(match.groups)),
    Option.flatMap(Rec.get("body")),
    Option.flatMap(parsed),
    Option.filter(Predicate.isObject),
    Option.getOrUndefined,
  );
