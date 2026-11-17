import { Array as Arr, Option, Predicate, pipe } from "effect";

import { defineRule } from "#/entities/rule/index.ts";
import {
  afterTitle,
  descendants,
  directoryOf,
  matchesAny,
  plainText,
  sectionLevel,
  sectionsOf,
  sentenceCount,
  subHeadingsOf,
  titleOf,
} from "#/features/check-documents/lib/markdown.ts";
import type { Section } from "#/features/check-documents/lib/markdown.ts";
import {
  stringListsOption,
  stringOption,
  stringsOption,
} from "#/features/check-documents/lib/options.ts";
import { bannedHeading } from "#/features/check-documents/lib/shapes.ts";
import type { Rule, RuleContext } from "#/shared/config/index.ts";

const ONE = 1;
const TREE = /[├└]──/u;
const COMMANDS: readonly string[] = ["Commands"];
const STACK: readonly string[] = ["Tech stack"];

const expectedTitle = (context: RuleContext): Option.Option<string> =>
  pipe(
    Option.fromNullishOr(context.manifest),
    Option.filter(
      (manifest) =>
        manifest.directory === directoryOf(context.filename) && manifest.directory !== "",
    ),
    Option.flatMap((manifest) =>
      pipe(Option.fromNullishOr(manifest.data["name"]), Option.filter(Predicate.isString)),
    ),
    Option.orElse(() =>
      pipe(
        stringOption("rootTitle")(context),
        Option.filter(() => directoryOf(context.filename) === ""),
      ),
    ),
  );

export const agentsTitle: Rule = defineRule({
  meta: { description: "AGENTS.md opens with the package or repository name as its title" },
  create: (context) => ({
    document: (): void => {
      const title = titleOf(context);
      if (Option.isNone(title)) {
        context.report({ line: ONE, message: "Start with a level 1 title" });
        return;
      }
      for (const name of Option.toArray(expectedTitle(context))) {
        if (title.value.text !== name) {
          context.report({
            node: title.value.node,
            message: `The title ${title.value.text} is not ${name}`,
          });
        }
      }
    },
  }),
});

export const agentsOpening: Rule = defineRule({
  meta: { description: "A paragraph right after the title says what this is" },
  create: (context) => ({
    document: (): void => {
      const opens = pipe(
        afterTitle(context),
        Option.exists((node) => node.type === "paragraph"),
      );
      if (Option.isSome(titleOf(context)) && !opens) {
        context.report({
          line: ONE,
          message: "Write a paragraph after the title that says what this is",
        });
      }
    },
  }),
});

const describeSections = (sections: readonly (readonly string[])[]): string =>
  pipe(
    sections,
    Arr.map((names) => Arr.join(names, " or ")),
    Arr.join(", "),
  );

const sectionHeadings = (context: RuleContext): readonly string[] =>
  pipe(
    subHeadingsOf(context),
    Arr.filter(({ level }) => level === sectionLevel),
    Arr.map(({ text }) => text),
  );

export const agentsSections: Rule = defineRule({
  meta: { description: "The level 2 headings are exactly the configured sections, in order" },
  create: (context) => ({
    document: (): void => {
      const expected = stringListsOption("sections")(context);
      const actual = sectionHeadings(context);
      const same =
        actual.length === expected.length &&
        pipe(
          Arr.zip(expected, actual),
          Arr.every(([names, text]) => matchesAny(names)(text)),
        );
      if (Arr.isReadonlyArrayNonEmpty(expected) && !same) {
        context.report({
          line: ONE,
          message: `Use exactly these level 2 sections in order: ${describeSections(expected)}`,
        });
      }
    },
  }),
});

const sectionNamed =
  (names: readonly string[]) =>
  (context: RuleContext): Option.Option<Section> =>
    pipe(
      sectionsOf(context),
      Arr.findFirst(
        ({ heading }) => heading.level === sectionLevel && matchesAny(names)(heading.text),
      ),
    );

const hasCode = (section: Section): boolean =>
  pipe(
    section.blocks,
    Arr.flatMap((block) => [block, ...descendants(block)]),
    Arr.some((node) => node.type === "codeBlock" || node.type === "code"),
  );

export const agentsCommands: Rule = defineRule({
  meta: { description: "The commands section shows at least one command in code" },
  create: (context) => ({
    document: (): void => {
      const names = stringsOption({ key: "headings", fallback: COMMANDS })(context);
      const missing = pipe(
        sectionNamed(names)(context),
        Option.filter((section) => !hasCode(section)),
      );
      for (const section of Option.toArray(missing)) {
        context.report({ node: section.heading.node, message: "Show the commands in code" });
      }
    },
  }),
});

export const agentsWorkspaceShape: Rule = defineRule({
  meta: { description: "A workspace AGENTS.md is a short paragraph and rules, without sections" },
  create: (context) => ({
    document: (): void => {
      for (const heading of subHeadingsOf(context)) {
        context.report({
          node: heading.node,
          message: "A workspace AGENTS.md has no sections; keep only what this workspace adds",
        });
      }
    },
  }),
});

export const agentsSkillOwned: Rule = bannedHeading({
  pattern:
    /pull request|\bPRs?\b|commit|code style|coding (?:standards|style|conventions)|testing|test (?:policy|guidelines)|プルリクエスト|コミット|コードスタイル|コーディング規約|テスト方針/iu,
  description: "AGENTS.md leaves pull requests, commits, code style and testing to skills",
  message: "a skill owns this; leave it out of AGENTS.md",
});

export const agentsNoStructureHeading: Rule = bannedHeading({
  pattern:
    /structure|director(?:y|ies)|layout|^packages$|^workspaces$|構成|ディレクトリ|パッケージ一覧/iu,
  description: "AGENTS.md has no repository structure or package list",
  message: "agents can list the files themselves, and a hand-kept list goes stale",
});

export const agentsNoStructure: Rule = defineRule({
  meta: { description: "AGENTS.md has no repository structure or directory tree" },
  create: (context) => {
    const headings = agentsNoStructureHeading.create(context);
    return {
      ...headings,
      codeBlock: (node): void => {
        if (TREE.test(context.textOf(node))) {
          context.report({ node, message: "Directory trees go stale; leave them out" });
        }
      },
    };
  },
});

export const agentsStackSentence: Rule = defineRule({
  meta: { description: "The tech stack section is one sentence" },
  create: (context) => ({
    document: (): void => {
      const names = stringsOption({ key: "headings", fallback: STACK })(context);
      const tooLong = pipe(
        sectionNamed(names)(context),
        Option.filter(
          ({ blocks }) =>
            blocks.length !== ONE ||
            pipe(
              Arr.head(blocks),
              Option.exists(
                (block) =>
                  block.type !== "paragraph" || sentenceCount(plainText(context)(block)) > ONE,
              ),
            ),
        ),
      );
      for (const section of Option.toArray(tooLong)) {
        context.report({
          node: section.heading.node,
          message: "State only the base stack in one sentence; lint rules and skills hold the rest",
        });
      }
    },
  }),
});
