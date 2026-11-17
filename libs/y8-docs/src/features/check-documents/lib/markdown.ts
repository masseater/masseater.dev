import type { MarkdownNode, RuleContext } from "@r_masseater/y8";
import { Array as Arr, Option, Predicate, String as Str, pipe } from "effect";

const SEPARATOR = "/";
const PARENT = "..";
const CURRENT = ".";
const SCHEME = /^[a-z][a-z\d+.-]*:/iu;
const PROTOCOL_RELATIVE = "//";
const SUFFIX = /[#?].*$/u;
const BACKTICKS = /^`+|`+$/gu;
const SENTENCE_END = /[.!?。！？](?=\s|$)/gu;
const TITLE_LEVEL = 1;
const SECTION_LEVEL = 2;
const ONE = 1;

export interface Heading {
  readonly node: MarkdownNode;
  readonly level: number;
  readonly text: string;
}

export interface Section {
  readonly heading: Heading;
  readonly blocks: readonly MarkdownNode[];
}

export const descendants = (node: MarkdownNode): readonly MarkdownNode[] => {
  const found: MarkdownNode[] = [];
  const pending: MarkdownNode[] = Arr.reverse(node.children);
  while (Arr.isArrayNonEmpty(pending)) {
    const next = pending.pop() ?? node;
    found.push(next);
    pending.push(...Arr.reverse(next.children));
  }
  return found;
};

const isTextual = (node: MarkdownNode): boolean => node.type === "text" || node.type === "code";

export const plainText =
  (context: RuleContext) =>
  (node: MarkdownNode): string =>
    pipe(
      descendants(node),
      Arr.filter(isTextual),
      Arr.map((part) => Str.replaceAll(BACKTICKS, "")(context.textOf(part))),
      Arr.join(""),
      Str.trim,
    );

const levelOf = (node: MarkdownNode): number =>
  pipe(
    Option.fromNullishOr(node.data["level"]),
    Option.filter(Predicate.isNumber),
    Option.getOrElse(() => TITLE_LEVEL),
  );

export const headingOf =
  (context: RuleContext) =>
  (node: MarkdownNode): Heading => ({
    node,
    level: levelOf(node),
    text: plainText(context)(node),
  });

export const headingsOf = (context: RuleContext): readonly Heading[] =>
  pipe(
    descendants(context.root),
    Arr.filter((node) => node.type === "heading"),
    Arr.map(headingOf(context)),
  );

export const subHeadingsOf = (context: RuleContext): readonly Heading[] =>
  pipe(
    headingsOf(context),
    Arr.filter(({ level }) => level >= SECTION_LEVEL),
  );

export const sectionLevel = SECTION_LEVEL;

const isHeadingAtMost =
  (level: number) =>
  (node: MarkdownNode): boolean =>
    node.type === "heading" && levelOf(node) <= level;

export const sectionsOf = (context: RuleContext): readonly Section[] => {
  const blocks = context.root.children;
  return pipe(
    blocks,
    Arr.flatMap((node, index) =>
      Option.toArray(
        Option.liftPredicate(node, (block) => block.type === "heading").pipe(
          Option.map((block): Section => {
            const heading = headingOf(context)(block);
            const rest = Arr.drop(blocks, index + ONE);
            return {
              heading,
              blocks: pipe(
                rest,
                Arr.takeWhile((next) => !isHeadingAtMost(heading.level)(next)),
              ),
            };
          }),
        ),
      ),
    ),
  );
};

export const matchesAny =
  (names: readonly string[]) =>
  (text: string): boolean =>
    pipe(
      names,
      Arr.some((name) => Str.toLowerCase(name) === Str.toLowerCase(text)),
    );

const isBadge = (node: MarkdownNode): boolean =>
  node.type === "paragraph" &&
  pipe(
    descendants(node),
    Arr.some((child) => child.type === "image"),
  ) &&
  pipe(
    descendants(node),
    Arr.every((child) =>
      pipe(
        ["image", "link", "text", "softBreak"],
        Arr.some((type) => type === child.type),
      ),
    ),
  );

export const leadingBlocks = (context: RuleContext): readonly MarkdownNode[] =>
  pipe(context.root.children, Arr.dropWhile(isBadge));

export const titleOf = (context: RuleContext): Option.Option<Heading> =>
  pipe(
    Arr.head(leadingBlocks(context)),
    Option.filter((node) => node.type === "heading" && levelOf(node) === TITLE_LEVEL),
    Option.map((node) => headingOf(context)(node)),
  );

export const afterTitle = (context: RuleContext): Option.Option<MarkdownNode> =>
  Arr.get(leadingBlocks(context), ONE);

export const sentenceCount = (text: string): number =>
  Math.max(ONE, Arr.fromIterable(Str.matchAll(SENTENCE_END)(text)).length);

export const directoryOf = (file: string): string =>
  pipe(Str.split(file, SEPARATOR), Arr.dropRight(ONE), Arr.join(SEPARATOR));

export const joinPath = (...parts: readonly string[]): string =>
  pipe(parts, Arr.filter(Str.isNonEmpty), Arr.join(SEPARATOR));

const normalized = (path: string): Option.Option<string> => {
  const kept: string[] = [];
  for (const part of Str.split(path, SEPARATOR)) {
    if (part === PARENT) {
      if (Arr.isArrayEmpty(kept)) {
        return Option.none();
      }
      kept.pop();
    } else if (Str.isNonEmpty(part) && part !== CURRENT) {
      kept.push(part);
    }
  }
  return Option.some(Arr.join(kept, SEPARATOR));
};

const decoded = (path: string): string =>
  pipe(
    Option.liftThrowable(decodeURI)(path),
    Option.getOrElse(() => path),
  );

export const isExternal = (destination: string): boolean =>
  SCHEME.test(destination) || Str.startsWith(PROTOCOL_RELATIVE)(destination);

export const destinationOf = (node: MarkdownNode): Option.Option<string> =>
  pipe(Option.fromNullishOr(node.data["destination"]), Option.filter(Predicate.isString));

export const linksOf = (context: RuleContext): readonly MarkdownNode[] =>
  pipe(
    descendants(context.root),
    Arr.filter((node) => node.type === "link" || node.type === "image"),
  );

export const localTargetOf =
  (context: RuleContext) =>
  (node: MarkdownNode): Option.Option<string> =>
    pipe(
      destinationOf(node),
      Option.filter(
        (destination) => !isExternal(destination) && !Str.startsWith(SEPARATOR)(destination),
      ),
      Option.map((destination) => decoded(Str.replace(SUFFIX, "")(destination))),
      Option.filter(Str.isNonEmpty),
      Option.flatMap((target) => normalized(joinPath(directoryOf(context.filename), target))),
    );

const isInCode = (node: MarkdownNode): boolean =>
  pipe(
    Option.fromNullishOr(node.parent),
    Option.match({
      onNone: () => false,
      onSome: (parent) => parent.type === "codeBlock" || isInCode(parent),
    }),
  );

export const proseNodes = (context: RuleContext): readonly MarkdownNode[] =>
  pipe(
    descendants(context.root),
    Arr.filter((node) => node.type === "text" && !isInCode(node)),
  );

export const SKILL_FILE = /(?:^|\/)skills\/(?<name>[^/]+)\/SKILL\.md$/u;

const skillNamesBy = new WeakMap<RuleContext["filesUnder"], readonly string[]>();

const skillNamesOf = (filesUnder: RuleContext["filesUnder"]): readonly string[] =>
  pipe(
    filesUnder(""),
    Arr.flatMap((path) =>
      pipe(
        Option.fromNullishOr(SKILL_FILE.exec(path)),
        Option.flatMap((match) => Option.fromNullishOr(match.groups)),
        Option.flatMap((groups) => Option.fromNullishOr(groups["name"])),
        Option.toArray,
      ),
    ),
    Arr.dedupe,
  );

export const skillNamesIn = ({ filesUnder }: RuleContext): readonly string[] =>
  pipe(
    Option.fromNullishOr(skillNamesBy.get(filesUnder)),
    Option.getOrElse(() => {
      const names = skillNamesOf(filesUnder);
      skillNamesBy.set(filesUnder, names);
      return names;
    }),
  );

export const isPublished = (data: Readonly<Record<string, unknown>>): boolean =>
  data["private"] !== true && Predicate.isString(data["name"]);
