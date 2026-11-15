import { Array as Arr, Effect, Option, Schema, String as Str, pipe } from "effect";
import { parse } from "yaml";

import { groupOf } from "#/shared/lib/match-groups.ts";
import type { Problem, RuleName } from "#/shared/lib/problem.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";
import { positionOf } from "#/shared/lib/text-position.ts";

const RULE: RuleName = "skill-file";
const SKILL_FILE = /(?:^|\/)SKILL\.md$/u;
const INSTALLED = /(?:^|\/)\.(?:agents|claude|codex)\/skills\//u;
const MARKDOWN = ".md";
const LICENSE_FILE = /^LICEN[CS]E(?:\.[^/]+)?$/iu;
const FRONTMATTER = /^---\n(?<yaml>[\s\S]*?)\n---\n/u;
const HEADING = /^# (?<title>.+)$/mu;
const NAME_KEY = /^name:/mu;
const LICENSE_KEY = /^license:/mu;
const CODE = /```[\s\S]*?```|`[^`\n]*`/gu;
const LINK = /\]\((?<target>[^)\s]+)\)/gu;
const EXTERNAL = /^(?:[a-z][a-z0-9+.-]*:|#|\/)|[<>{}]/iu;
const FRAGMENT = /#.*$/u;
const GITHUB = "https://github.com/";
const COMMIT_LINK = /\/(?:blob|tree)\/[0-9a-f]{40}(?:\/|$)/u;
const BLANK = /\s+/u;
const SEPARATOR = "/";
const START = 0;
const FIRST = 1;
const READ_CONCURRENCY = 16;

const Metadata = Schema.Struct({ "derived-from": Schema.optional(Schema.String) });
const Frontmatter = Schema.Struct({
  name: Schema.optional(Schema.String),
  license: Schema.optional(Schema.Unknown),
  metadata: Schema.optional(Metadata),
});
const decodeFrontmatter = Schema.decodeUnknownOption(Frontmatter);

interface Skill {
  readonly file: string;
  readonly directory: string;
  readonly source: string;
}

const offsetOf = (source: string, pattern: RegExp | string): number =>
  pipe(
    Str.search(pattern)(source),
    Option.getOrElse(() => START),
  );

const frontmatterOf = (source: string): Option.Option<typeof Frontmatter.Type> =>
  pipe(
    groupOf("yaml")(FRONTMATTER.exec(source)),
    Option.flatMap((yaml) => decodeFrontmatter(parse(yaml))),
  );

const bodyStartOf = (source: string): number =>
  pipe(
    Option.fromNullishOr(FRONTMATTER.exec(source)),
    Option.map((found) => found[START].length),
    Option.getOrElse(() => START),
  );

const headingText = (heading: Option.Option<string>): string =>
  pipe(
    heading,
    Option.map((title) => `"# ${title}"`),
    Option.getOrElse(() => "missing"),
  );

const nameProblems = (
  { source, directory }: Skill,
  name: string,
  folder: string,
): readonly { readonly index: number; readonly message: string }[] => {
  const bodyStart = bodyStartOf(source);
  const body = Str.slice(bodyStart)(source);
  const heading = groupOf("title")(HEADING.exec(body));
  return [
    ...pipe(
      Option.liftPredicate(name, (found) => found !== folder),
      Option.map((found) => ({
        index: offsetOf(source, NAME_KEY),
        message: `The frontmatter name "${found}" differs from the directory ${directory}. Give the skill the name of its directory.`,
      })),
      Option.toArray,
    ),
    ...pipe(
      Option.liftPredicate(heading, (found) => !Option.contains(found, name)),
      Option.map((found) => ({
        index: bodyStart + offsetOf(body, HEADING),
        message: `The first heading is ${headingText(found)}. Start the body with "# ${name}", the frontmatter name.`,
      })),
      Option.toArray,
    ),
  ];
};

const derivedProblems = (
  source: string,
  derived: string,
): readonly { readonly index: number; readonly message: string }[] =>
  pipe(
    Str.split(Str.trim(derived), BLANK),
    Arr.filter((url) => Str.startsWith(GITHUB)(url) && !COMMIT_LINK.test(url)),
    Arr.map((url) => ({
      index: offsetOf(source, url),
      message: `metadata.derived-from holds ${url}, which does not name a commit, so what it shows changes. Write a permalink: ${GITHUB}<owner>/<repo>/blob/<commit>/<path>.`,
    })),
  );

const frontmatterProblems = (skill: Skill, folder: string): readonly Problem[] =>
  pipe(
    frontmatterOf(skill.source),
    Option.map((frontmatter) => [
      ...pipe(
        Option.fromUndefinedOr(frontmatter.name),
        Option.map((name) => nameProblems(skill, name, folder)),
        Option.getOrElse(() => []),
      ),
      ...pipe(
        Option.fromUndefinedOr(frontmatter.license),
        Option.map(() => ({
          index: offsetOf(skill.source, LICENSE_KEY),
          message:
            "The frontmatter has license. Skills here carry neither a license field nor a LICENSE file. Remove it.",
        })),
        Option.toArray,
      ),
      ...pipe(
        Option.fromUndefinedOr(frontmatter.metadata),
        Option.flatMap((metadata) => Option.fromUndefinedOr(metadata["derived-from"])),
        Option.map((derived) => derivedProblems(skill.source, derived)),
        Option.getOrElse(() => []),
      ),
    ]),
    Option.getOrElse(() => []),
    Arr.map(({ index, message }): Problem => ({
      file: skill.file,
      ...positionOf(skill.source)(index),
      rule: RULE,
      message,
    })),
  );

interface Link {
  readonly target: string;
  readonly index: number;
}

const linkOf = (found: RegExpMatchArray): readonly Link[] =>
  pipe(
    groupOf("target")(found),
    Option.filter((target) => !EXTERNAL.test(target)),
    Option.map((target) => Str.replace(FRAGMENT, "")(target)),
    Option.filter(Str.isNonEmpty),
    Option.map((target): Link => ({ target, index: found.index ?? START })),
    Option.toArray,
  );

type Range = readonly [start: number, end: number];

const rangeOf = (found: RegExpMatchArray): Range => {
  const start = found.index ?? START;
  return [start, start + found[START].length];
};

const isOutside =
  (ranges: readonly Range[]) =>
  ({ index }: Link): boolean =>
    !pipe(
      ranges,
      Arr.some(([start, end]) => index >= start && index < end),
    );

const linksIn = (source: string): readonly Link[] => {
  const code = pipe(Arr.fromIterable(Str.matchAll(CODE)(source)), Arr.map(rangeOf));
  return pipe(
    Arr.fromIterable(Str.matchAll(LINK)(source)),
    Arr.flatMap(linkOf),
    Arr.filter(isOutside(code)),
  );
};

const linkProblems = Effect.fn("linkProblems")(function* linkProblems(file: string) {
  const files = yield* RepositoryFiles;
  const text = yield* files.readFile(file);
  if (Option.isNone(text)) {
    return [];
  }
  const source = text.value;
  const directory = files.dirname(file);
  const isMissing = ({ target }: Link): Effect.Effect<boolean> =>
    files.exists(files.join(directory, target)).pipe(Effect.map((exists) => !exists));
  const missing = yield* Effect.filter(linksIn(source), isMissing);
  return pipe(
    missing,
    Arr.map(({ target, index }): Problem => ({
      file,
      ...positionOf(source)(index),
      rule: RULE,
      message: `links to ${target}, which does not exist. Fix the path or remove the link.`,
    })),
  );
});

const problemsIn = Effect.fn("problemsIn")(function* problemsIn(
  root: string,
  listed: readonly string[],
  name: string,
) {
  const files = yield* RepositoryFiles;
  const file = files.join(root, name);
  const directory = files.dirname(name);
  const inside = pipe(listed, Arr.filter(Str.startsWith(`${directory}${SEPARATOR}`)));
  const text = yield* files.readFile(file);
  const documents = pipe(
    inside,
    Arr.filter(Str.endsWith(MARKDOWN)),
    Arr.map((entry) => files.join(root, entry)),
  );
  const links = yield* Effect.forEach(documents, linkProblems, {
    concurrency: READ_CONCURRENCY,
  });
  const licenses = pipe(
    inside,
    Arr.filter((entry) => files.dirname(entry) === directory),
    Arr.filter((entry) => LICENSE_FILE.test(files.basename(entry))),
    Arr.map((entry): Problem => ({
      file: files.join(root, entry),
      line: FIRST,
      column: FIRST,
      rule: RULE,
      message:
        "is a license file inside a skill. Skills here carry neither a license field nor a LICENSE file. Delete it.",
    })),
  );
  return [
    ...pipe(
      text,
      Option.map((source) =>
        frontmatterProblems({ file, directory, source }, files.basename(directory)),
      ),
      Option.getOrElse((): readonly Problem[] => []),
    ),
    ...licenses,
    ...Arr.flatten(links),
  ];
});

/** @internal */
export const checkSkillFiles = Effect.fn("checkSkillFiles")(function* checkSkillFiles(
  root: string,
) {
  const files = yield* RepositoryFiles;
  const listed = yield* files.listedFiles(root);
  const skills = pipe(
    listed,
    Arr.filter((name) => SKILL_FILE.test(name) && !INSTALLED.test(name)),
  );
  const found = yield* Effect.forEach(skills, (name) => problemsIn(root, listed, name), {
    concurrency: READ_CONCURRENCY,
  });
  return Arr.flatten(found);
});
