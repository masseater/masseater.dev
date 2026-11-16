import { Array as Arr, Option, Record as Rec, String as Str, pipe } from "effect";

export type ProfileLine = Readonly<{ text: string; refs: readonly number[] }>;

export type ProfileTopic = Readonly<{ title: string; lines: readonly ProfileLine[] }>;

export type ProfileSection = Readonly<{
  title: string;
  lines: readonly ProfileLine[];
  topics: readonly ProfileTopic[];
}>;

export const DOCUMENT_TITLE = "# USER.md";

const REQUIRED_SECTIONS = ["Hard limits", "How to work with me", "Communication"];

const SECTION_START = /^## /mu;

const TOPIC_START = /^### /mu;

const SECTION_MARK = "## ";

const TOPIC_MARK = "### ";

const BULLET = "- ";

const SCOPE_MARK = "In ";

const PREAMBLE = 1;

const REFS = /\s*\[(?<refs>\d+(?:[\s,]+\d+)*)\]\s*$/u;

const REF_SEPARATOR = /[\s,]+/u;

const refNumbers = (refs: string): readonly number[] =>
  pipe(Str.split(refs, REF_SEPARATOR), Arr.map(Number));

const refsOf = (raw: string): ProfileLine =>
  pipe(
    Str.match(REFS)(raw),
    Option.flatMap((found) => Option.fromNullishOr(found.groups)),
    Option.flatMap(Rec.get("refs")),
    Option.match({
      onNone: () => ({ text: raw, refs: [] }),
      onSome: (refs) => ({ text: Str.replace(REFS, "")(raw), refs: refNumbers(refs) }),
    }),
  );

const withoutBullet = (raw: string): string =>
  pipe(
    Option.liftPredicate(raw, Str.startsWith(BULLET)),
    Option.map(Str.slice(BULLET.length)),
    Option.getOrElse(() => raw),
  );

const isBody = (raw: string): boolean => Str.isNonEmpty(raw) && !Str.startsWith("#")(raw);

const blockOf = (chunk: string): ProfileTopic => {
  const rows = pipe(Str.split(chunk, "\n"), Arr.map(Str.trim));
  return {
    title: Arr.headNonEmpty(rows),
    lines: pipe(
      Arr.tailNonEmpty(rows),
      Arr.filter(isBody),
      Arr.map(withoutBullet),
      Arr.map(refsOf),
    ),
  };
};

const sectionOf = (chunk: string): ProfileSection => {
  const blocks = Str.split(chunk, TOPIC_START);
  return {
    ...blockOf(Arr.headNonEmpty(blocks)),
    topics: pipe(Arr.tailNonEmpty(blocks), Arr.map(blockOf)),
  };
};

export const parseUserMd = (markdown: string): readonly ProfileSection[] =>
  pipe(Str.split(markdown, SECTION_START), Arr.drop(PREAMBLE), Arr.map(sectionOf));

const refsText = (refs: readonly number[]): string => pipe(refs, Arr.map(String), Arr.join(" "));

const lineText = ({ text, refs }: ProfileLine): string =>
  Arr.match(refs, {
    onEmpty: () => `${BULLET}${text}`,
    onNonEmpty: (some) => `${BULLET}${text} [${refsText(some)}]`,
  });

const topicText = ({ title, lines }: ProfileTopic): string =>
  pipe(lines, Arr.map(lineText), Arr.prepend(`\n${TOPIC_MARK}${title}`), Arr.join("\n"));

const sectionText = ({ title, lines, topics }: ProfileSection): string =>
  pipe(
    [...pipe(lines, Arr.map(lineText)), ...pipe(topics, Arr.map(topicText))],
    Arr.prepend(`${SECTION_MARK}${title}`),
    Arr.join("\n"),
  );

export const renderUserMd = (sections: readonly ProfileSection[]): string =>
  pipe(
    sections,
    Arr.map(sectionText),
    Arr.prepend(DOCUMENT_TITLE),
    Arr.join("\n\n"),
    Str.concat("\n"),
  );

const scopeOf = (section: ProfileSection): Option.Option<string> =>
  pipe(
    Option.liftPredicate(section.title, Str.startsWith(SCOPE_MARK)),
    Option.map(Str.slice(SCOPE_MARK.length)),
  );

const sameName =
  (wanted: string) =>
  (name: string): boolean =>
    Str.toLowerCase(name) === Str.toLowerCase(wanted);

export const inScope =
  (scope: Option.Option<string>) =>
  (section: ProfileSection): boolean =>
    Option.match(scopeOf(section), {
      onNone: () => true,
      onSome: (name) => pipe(scope, Option.exists(sameName(name))),
    });

export const linesOf = (section: ProfileSection): readonly ProfileLine[] => [
  ...section.lines,
  ...pipe(
    section.topics,
    Arr.flatMap((topic) => topic.lines),
  ),
];

const hasLines =
  (sections: readonly ProfileSection[]) =>
  (title: string): boolean =>
    pipe(
      sections,
      Arr.some(
        (section) => section.title === title && Arr.isReadonlyArrayNonEmpty(linesOf(section)),
      ),
    );

export const isUserMd = (sections: readonly ProfileSection[]): boolean =>
  pipe(REQUIRED_SECTIONS, Arr.every(hasLines(sections)));
