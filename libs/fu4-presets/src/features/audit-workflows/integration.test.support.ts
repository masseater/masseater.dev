import { Array as Arr, Option, String as Str, pipe } from "effect";

export const ZIZMOR_TESTS = "fixtures/zizmor-tests/audit";
export const KNOWN = "fixtures/zizmor-tests-known-failures.txt";

const FUNCTION = /\nfn (?<name>\w+)\(\)/gu;
const ASSERT = "insta::assert_snapshot!(";
const SNAPSHOT = /@(?<raw>r#*)?"/u;
const INPUT = /\.input\(\s*input_under_test\(\s*"(?<path>[^"]+)"/gu;
const CONFIG = /\.config\(\s*input_under_test\(\s*"(?<path>[^"]+)"/u;
const ARGS = /\.args\(\[(?<list>[^\]]*)\]\)/gu;
const QUOTED = /"(?<text>[^"]*)"/gu;
const HEADER = /^\s*(?<level>error|warning|help|info)\[(?<ident>[\w-]+)\]:/u;
const ARROW = /^\s*-->\s+(?<path>\S+):(?<line>\d+):(?<column>\d+)\s*$/u;
const INPUT_MARK = /^@@INPUT@@\/?/u;
const ESCAPE = /\\(?<char>.)/gsu;
const START = 0;
const PREFIX = 1;
const NEXT = 1;

const LEVELS: ReadonlyMap<string, string> = new Map([
  ["error", "High"],
  ["warning", "Medium"],
  ["help", "Low"],
  ["info", "Informational"],
]);

export interface Invocation {
  readonly inputs: readonly string[];
  readonly config: Option.Option<string>;
  readonly args: readonly string[];
  readonly unsupported: readonly string[];
}

export interface SnapshotCase {
  readonly id: string;
  readonly invocation: Invocation;
  readonly expected: readonly string[];
}

const groupOf =
  (group: string) =>
  (match: RegExpMatchArray | RegExpExecArray): Option.Option<string> =>
    pipe(
      Option.fromNullishOr(match.groups),
      Option.flatMapNullishOr((groups) => groups[group]),
    );

const groupsOf = (pattern: RegExp, text: string, group: string): readonly string[] =>
  pipe(
    Arr.fromIterable(Str.matchAll(pattern)(text)),
    Arr.flatMap((match) => Option.toArray(groupOf(group)(match))),
  );

const firstGroup = (pattern: RegExp, text: string, group: string): Option.Option<string> =>
  pipe(Option.fromNullishOr(pattern.exec(text)), Option.flatMap(groupOf(group)));

const UNSUPPORTED: readonly (readonly [string, string])[] = [
  [".diff(", "fix"],
  ["workspace.path()", "workspace"],
  ["NetworkMode::AssertOnline", "online"],
  ["OutputMode::", "output"],
  ["expects_failure(", "failure"],
  [".stdin(", "stdin"],
];

const unsupportedIn = (chain: string): readonly string[] =>
  pipe(
    UNSUPPORTED,
    Arr.filter(([needle]) => Str.includes(needle)(chain)),
    Arr.map(([, reason]) => reason),
  );

const invocationOf = (chain: string): Invocation => ({
  inputs: groupsOf(INPUT, chain, "path"),
  config: firstGroup(CONFIG, chain, "path"),
  args: pipe(
    groupsOf(ARGS, chain, "list"),
    Arr.flatMap((list) => groupsOf(QUOTED, list, "text")),
  ),
  unsupported: unsupportedIn(chain),
});

const quotedEnd = (text: string, start: number): number => {
  let at = start;
  while (at < text.length && text[at] !== '"') {
    at += Number(text[at] === "\\") + NEXT;
  }
  return at;
};

interface Literal {
  readonly chain: string;
  readonly body: string;
}

const rawBody = (chunk: string, start: number, hashes: string): string =>
  Option.match(Str.indexOf(`"${hashes}`)(Str.slice(start)(chunk)), {
    onNone: () => Str.slice(start)(chunk),
    onSome: (length) => Str.slice(start, start + length)(chunk),
  });

const quotedBody = (chunk: string, start: number): string =>
  Str.replaceAll(ESCAPE, "$<char>")(Str.slice(start, quotedEnd(chunk, start))(chunk));

const literalIn = (chunk: string): Option.Option<Literal> =>
  pipe(
    Option.fromNullishOr(SNAPSHOT.exec(chunk)),
    Option.map((match) => {
      const start = match.index + match[START].length;
      const body = Option.match(groupOf("raw")(match), {
        onNone: () => quotedBody(chunk, start),
        onSome: (raw) => rawBody(chunk, start, Str.slice(PREFIX)(raw)),
      });
      return { chain: Str.slice(START, match.index)(chunk), body };
    }),
  );

const pathKey = (path: string): string => Str.replace(INPUT_MARK, "")(path);

const lineAt = (lines: readonly string[], index: number): string =>
  Option.getOrElse(Arr.get(lines, index), () => "");

const findingAt = (lines: readonly string[], index: number): Option.Option<string> =>
  Option.gen(function* finding() {
    const header = yield* Option.fromNullishOr(HEADER.exec(lineAt(lines, index)));
    const arrow = yield* Option.fromNullishOr(ARROW.exec(lineAt(lines, index + NEXT)));
    const level = yield* groupOf("level")(header);
    const ident = yield* groupOf("ident")(header);
    const severity = yield* Option.fromNullishOr(LEVELS.get(level));
    const path = yield* groupOf("path")(arrow);
    const line = yield* groupOf("line")(arrow);
    const column = yield* groupOf("column")(arrow);
    return `${pathKey(path)}:${line}:${column} ${ident} ${severity}`;
  });

const findingsIn = (body: string): readonly string[] => {
  const lines = Str.split("\n")(body);
  const found = pipe(
    Arr.makeBy(lines.length, (index) => findingAt(lines, index)),
    Arr.flatMap(Option.toArray),
  );
  return Arr.sort(found, Str.Order);
};

const functionsIn = (source: string): readonly (readonly [string, string])[] => {
  const starts = Arr.fromIterable(Str.matchAll(FUNCTION)(source));
  return pipe(
    starts,
    Arr.map((match, index) => {
      const begin = match.index;
      const end = Option.match(Arr.get(starts, index + NEXT), {
        onNone: () => source.length,
        onSome: (next) => next.index,
      });
      const name = Option.getOrElse(groupOf("name")(match), () => "");
      return [name, Str.slice(begin, end)(source)] as const;
    }),
  );
};

const casesOfFunction =
  (file: string) =>
  ([name, body]: readonly [string, string]): readonly SnapshotCase[] =>
    pipe(
      Arr.drop(Str.split(ASSERT)(body), NEXT),
      Arr.flatMap((chunk) => Option.toArray(literalIn(chunk))),
      Arr.map((literal, index) => ({
        id: `${file}::${name}#${String(index)}`,
        invocation: invocationOf(literal.chain),
        expected: findingsIn(literal.body),
      })),
    );

export const casesIn =
  (file: string) =>
  (source: string): readonly SnapshotCase[] =>
    pipe(functionsIn(source), Arr.flatMap(casesOfFunction(file)));

export const knownIds = (text: string): readonly string[] =>
  pipe(
    Str.split("\n")(text),
    Arr.map((line) => Str.trim(Arr.headNonEmpty(Str.split(" #")(line)))),
    Arr.filter(Str.isNonEmpty),
  );
