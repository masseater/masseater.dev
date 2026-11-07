import {
  Array as Arr,
  Match,
  Option,
  Order,
  Record as Rec,
  String as Str,
  pipe,
  Struct,
} from "effect";
import type { Element, RootContent } from "hast";
import * as LINGUIST from "linguist-languages";
import type { Language } from "linguist-languages";
import { refractor } from "refractor/all";

import type { Parser, Span, Unit } from "./parser.ts";
import { proseUnitsIn } from "./prose.ts";

const READ = /comment|string|attr-value/u;

const FIRST = 0;

const FENCE = /^\s*(?:```|~~~)/mu;

const NEVER = /(?!)/u;

const SHEBANG = /^#!\s*(?:\S*\/)?(?:env\s+(?:-\S+\s+)*)?(?<interpreter>[^\s/]+)/u;

const SIGNATURES: ReadonlyMap<string, RegExp> = new Map([
  ["typescript", /^(?:export )?(?:interface \w+(?:<[^>\n]*>)? \{|type \w+(?:<[^>\n]*>)? = )/mu],
  [
    "javascript",
    /^(?:import .+ from ["']|export (?:default|const|function|class) |const \w+ = require\()/mu,
  ],
  [
    "python",
    /^(?:from [\w.]+ import |def \w+\(.*\)(?: -> .+)?:$|if __name__ == ["']__main__["']:)/mu,
  ],
  ["ruby", /^(?:require ["'][\w/]+["']|def \w+[?!]?(?:\(.*\))?)$/mu],
  ["kotlin", /^(?:fun main\(|import kotlinx?\.)/mu],
  ["go", /^package \w+$(?=[\s\S]*^func )/mu],
  ["rust", /^(?:use (?:std|crate)::|fn main\(\)|pub fn \w+)/mu],
  ["java", /^(?:package [\w.]+;|import java\.)/mu],
  ["cpp", /^(?:#include <(?:iostream|vector|string|memory)>|using namespace std;)/mu],
  ["c", /^#include\s*[<"]/mu],
  ["csharp", /^(?:using System[\w.]*;|namespace [\w.]+)/mu],
  ["php", /^<\?php/u],
  [
    "sql",
    /^(?:SELECT .+ FROM |INSERT INTO |CREATE (?:TABLE|INDEX|VIEW) |UPDATE \w+ SET |DELETE FROM )/mu,
  ],
  ["swift", /^import (?:SwiftUI|Foundation|UIKit)$/mu],
]);

const isRead = ({ properties }: Element): boolean =>
  pipe(
    Arr.ensure(properties.className),
    Arr.some((name) => READ.test(String(name))),
  );

interface Leaf {
  readonly length: number;
  readonly read: boolean;
}

const leavesOf = (node: RootContent, read: boolean): readonly Leaf[] =>
  Match.value(node).pipe(
    Match.when({ type: "text" }, ({ value }) => [{ length: value.length, read }]),
    Match.when({ type: "element" }, (element) =>
      pipe(
        element.children,
        Arr.flatMap((child) => leavesOf(child, read || isRead(element))),
      ),
    ),
    Match.orElse(() => []),
  );

const spansOf = (nodes: readonly RootContent[]): readonly Span[] => {
  const spans: Span[] = [];
  let at = FIRST;
  for (const { length, read } of pipe(
    nodes,
    Arr.flatMap((node) => leavesOf(node, false)),
  )) {
    if (read) {
      spans.push({ start: at, end: at + length });
    }
    at += length;
  }
  return spans;
};

const codeUnitsOf =
  (format: string) =>
  (text: string): readonly Unit[] =>
    proseUnitsIn(text)(spansOf(refractor.highlight(text, format).children));

const interpreterOf = (text: string): string =>
  Option.fromNullishOr(SHEBANG.exec(text)).pipe(
    Option.flatMapNullishOr(({ groups }) => groups),
    Option.flatMapNullishOr(({ interpreter }) => interpreter),
    Option.getOrElse(() => ""),
  );

const canonicalOf = (name: string): Option.Option<string> =>
  Arr.findFirst(
    Struct.keys(refractor.languages),
    (key) => refractor.languages[key] === refractor.languages[name],
  );

const namesOf = ({ name, aliases = [] }: Language): readonly string[] =>
  pipe(
    [name, ...aliases],
    Arr.map((alias) => Str.toLowerCase(alias)),
  );

const fileNamesOf = ({ extensions = [], filenames = [] }: Language): readonly string[] =>
  pipe(
    [...extensions, ...filenames],
    Arr.map((fileName) => Str.toLowerCase(fileName)),
  );

const detectorOf = (
  format: string,
  { interpreters = [] }: Language,
): ((text: string) => boolean) => {
  const signature = SIGNATURES.get(format) ?? NEVER;
  return (text) =>
    (signature.test(text) || interpreters.includes(interpreterOf(text))) && !FENCE.test(text);
};

const parserOf = (language: Language): Option.Option<Parser> =>
  Arr.findFirst(namesOf(language), (name) => refractor.registered(name)).pipe(
    Option.flatMap(canonicalOf),
    Option.map((format) => ({
      format,
      extensions: fileNamesOf(language),
      aliases: pipe(
        namesOf(language),
        Arr.filter((name) => name !== format),
      ),
      accepts: detectorOf(format, language),
      unitsOf: codeUnitsOf(format),
    })),
  );

const bySignature = (parser: Parser): number => {
  const formats = [...SIGNATURES.keys()];
  return Option.getOrElse(
    Arr.findFirstIndex(formats, (format) => format === parser.format),
    () => formats.length,
  );
};

const merged = (parsers: Arr.NonEmptyReadonlyArray<Parser>): Parser => {
  const [first] = parsers;
  return {
    format: first.format,
    extensions: Arr.dedupe(
      pipe(
        parsers,
        Arr.flatMap(({ extensions }) => extensions),
      ),
    ),
    aliases: Arr.dedupe(
      pipe(
        parsers,
        Arr.flatMap(({ aliases = [] }) => aliases),
      ),
    ),
    accepts: (text) =>
      pipe(
        parsers,
        Arr.some(({ accepts }) => accepts(text)),
      ),
    unitsOf: first.unitsOf,
  };
};

const LANGUAGE_PARSERS = pipe(
  Rec.values(LINGUIST),
  Arr.filter(({ type }) => type !== "prose"),
  Arr.flatMap((language) => Option.toArray(parserOf(language))),
);

const MERGED_PARSERS = pipe(
  Arr.groupBy(LANGUAGE_PARSERS, ({ format }) => format),
  Rec.values,
  Arr.map((parsers) => merged(parsers)),
);

const CODE_PARSERS: readonly Parser[] = Arr.sortWith(MERGED_PARSERS, bySignature, Order.Number);

const codeParsersBesides = (own: readonly Parser[]): readonly Parser[] => {
  const claimedNames = new Set(
    pipe(
      own,
      Arr.flatMap(({ format, aliases = [] }) => [format, ...aliases]),
    ),
  );
  const claimedExtensions = new Set(
    pipe(
      own,
      Arr.flatMap(({ extensions }) => extensions),
    ),
  );
  const unclaimed = ({ format, extensions, aliases = [], accepts, unitsOf }: Parser): Parser => ({
    format,
    extensions: pipe(
      extensions,
      Arr.filter((extension) => !claimedExtensions.has(extension)),
    ),
    aliases: pipe(
      aliases,
      Arr.filter((alias) => !claimedNames.has(alias)),
    ),
    accepts,
    unitsOf,
  });
  return pipe(
    CODE_PARSERS,
    Arr.filter(({ format }) => !claimedNames.has(format)),
    Arr.map((parser) => unclaimed(parser)),
  );
};

export { CODE_PARSERS, codeParsersBesides };
