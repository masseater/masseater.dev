import { Array as Arr, Option, Record as Rec, String as Str, pipe } from "effect";
import { AstUtils, GrammarAST } from "langium";

import type { From } from "#/shared/lib/from.ts";
import { FumxTerminals } from "#generated/langium/ast.ts";
import { FumxGrammar } from "#generated/langium/grammar.ts";

const FIRST_SUFFIX = 2;

const keywordsIn: From<GrammarAST.Grammar | GrammarAST.AbstractRule, ReadonlySet<string>> = (
  node,
) =>
  new Set(
    AstUtils.streamAst(node)
      .filter((child): child is GrammarAST.Keyword => GrammarAST.isKeyword(child))
      .map((keyword) => keyword.value),
  );

const grammar = FumxGrammar();

const allowedKeywords = pipe(
  grammar.rules,
  Arr.findFirst((rule) => rule.name === "Name"),
  Option.match({ onNone: () => new Set<string>(), onSome: keywordsIn }),
);

const allKeywords = Arr.fromIterable(keywordsIn(grammar));

const reserved = new Set(
  pipe(
    allKeywords,
    Arr.filter((keyword) => !allowedKeywords.has(keyword)),
  ),
);

const otherTerminals = pipe(
  Rec.toEntries(FumxTerminals),
  Arr.filter(([name]) => name !== "ID"),
  Arr.map(([, pattern]) => new RegExp(`^(?:${pattern.source})$`, "u")),
);

const identifier = new RegExp(`^(?:${FumxTerminals.ID.source})$`, "u");

const isUsable: From<string, boolean> = (name) =>
  identifier.test(name) &&
  !reserved.has(name) &&
  !pipe(
    otherTerminals,
    Arr.some((pattern) => pattern.test(name)),
  );

const slugOf: From<string, string> = (text) =>
  pipe(
    text,
    Str.normalize("NFKD"),
    Str.toLowerCase,
    Str.replaceAll(/[^a-z0-9]+/gu, "-"),
    Str.replaceAll(/^[-0-9]+|-+$/gu, ""),
  );

export const nameFrom: From<readonly string[], string> = (candidates) =>
  pipe(
    candidates,
    Arr.map(slugOf),
    Arr.findFirst(isUsable),
    Option.getOrElse(() => "part"),
  );

export const uniqueAmong: From<ReadonlySet<string>, From<string, string>> = (taken) => (name) =>
  pipe(
    Arr.range(FIRST_SUFFIX, taken.size + FIRST_SUFFIX),
    Arr.map((suffix) => `${name}-${String(suffix)}`),
    Arr.prepend(name),
    Arr.findFirst((candidate) => isUsable(candidate) && !taken.has(candidate)),
    Option.getOrElse(() => `${name}-${String(taken.size)}`),
  );
