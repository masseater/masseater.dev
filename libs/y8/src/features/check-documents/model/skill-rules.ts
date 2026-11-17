import { Array as Arr, Option, Predicate, String as Str, pipe } from "effect";

import { defineRule } from "#/entities/rule/index.ts";
import {
  descendants,
  directoryOf,
  joinPath,
  linksOf,
  localTargetOf,
  matchesAny,
  proseNodes,
  sectionLevel,
  subHeadingsOf,
  titleOf,
} from "#/features/check-documents/lib/markdown.ts";
import { numberOption, stringsOption } from "#/features/check-documents/lib/options.ts";
import { bannedHeading } from "#/features/check-documents/lib/shapes.ts";
import type { Frontmatter, Rule, RuleContext } from "#/shared/config/index.ts";

const ONE = 1;
const ORDERED_MAX = 5;
const PERSON = /\b(?:I|me|my|we|us|our)\b|\b(?:you|your)\b|私|僕|あなた|我々/u;
const USECASES: readonly string[] = ["Use cases"];
const MARKDOWN = ".md";
const EXPIRING =
  /\b(?:as of|currently|until (?:january|february|march|april|may|june|july|august|september|october|november|december|\d{4}))\b|\b(?:january|february|march|april|may|june|july|august|september|october|november|december) \d{4}\b|\d{4}年\d{1,2}月|現時点|現在のところ/iu;

const frontmatterOf = (context: RuleContext): Frontmatter =>
  pipe(
    Option.fromNullishOr(context.frontmatter),
    Option.getOrElse((): Frontmatter => ({})),
  );

const fieldOf = (context: RuleContext, key: string): Option.Option<string> =>
  pipe(Option.fromNullishOr(frontmatterOf(context)[key]), Option.filter(Predicate.isString));

const skillDirectory = (context: RuleContext): string => directoryOf(context.filename);

export const skillTitle: Rule = defineRule({
  meta: { description: "The level 1 title of SKILL.md is its name" },
  create: (context) => ({
    document: (): void => {
      const title = titleOf(context);
      const name = fieldOf(context, "name");
      const matches = pipe(
        Option.all({ title, name }),
        Option.exists(({ title: heading, name: value }) => heading.text === value),
      );
      if (Option.isSome(name) && !matches) {
        context.report({ line: ONE, message: `Start with the title ${name.value}` });
      }
    },
  }),
});

export const skillPurposeFirst: Rule = defineRule({
  meta: { description: "The first level 2 heading of SKILL.md is the fixed purpose heading" },
  create: (context) => ({
    document: (): void => {
      const names = stringsOption({ key: "headings", fallback: [] })(context);
      const first = pipe(
        subHeadingsOf(context),
        Arr.findFirst(({ level }) => level === sectionLevel),
      );
      const ok = pipe(
        first,
        Option.exists(({ text }) => matchesAny(names)(text)),
      );
      if (Arr.isReadonlyArrayNonEmpty(names) && !ok) {
        context.report({
          line: ONE,
          message: `Make the first level 2 heading ${Arr.join(names, " or ")}`,
        });
      }
    },
  }),
});

const linkedTargets = (context: RuleContext): readonly string[] =>
  pipe(
    linksOf(context),
    Arr.flatMap((node) => Option.toArray(localTargetOf(context)(node))),
  );

export const skillUsecases: Rule = defineRule({
  meta: { description: "A skill with a usecases directory links every use case" },
  create: (context) => ({
    document: (): void => {
      const directory = joinPath(skillDirectory(context), "usecases");
      const usecases = pipe(context.filesUnder(directory), Arr.filter(Str.endsWith(MARKDOWN)));
      const names = stringsOption({ key: "headings", fallback: USECASES })(context);
      const hasSection = pipe(
        subHeadingsOf(context),
        Arr.some(({ text }) => matchesAny(names)(text)),
      );
      if (Arr.isReadonlyArrayNonEmpty(usecases) && !hasSection) {
        context.report({ line: ONE, message: `Add a ${Arr.join(names, " or ")} section` });
      }
      const linked = linkedTargets(context);
      for (const path of pipe(
        usecases,
        Arr.filter((usecase) => !Arr.contains(linked, usecase)),
      )) {
        context.report({ line: ONE, message: `Link the use case ${path}` });
      }
    },
  }),
});

export const skillDescriptionPerson: Rule = defineRule({
  meta: { description: "The description is written in the third person" },
  create: (context) => ({
    document: (): void => {
      const personal = pipe(
        fieldOf(context, "description"),
        Option.exists((description) => PERSON.test(description)),
      );
      if (personal) {
        context.report({ line: ONE, message: "Write the description in the third person" });
      }
    },
  }),
});

export const skillNoWhenSection: Rule = bannedHeading({
  pattern: /when to use|when to load|使うとき|使用するとき|使いどころ|いつ使う|使用タイミング/iu,
  description: "SKILL.md has no when-to-use section",
  message: "the agent decides from the description before reading the body",
});

const isStepHeading = /^(?:step|ステップ|手順)\s*\d+|^\d+[.)．]/iu;

export const skillNoSteps: Rule = defineRule({
  meta: { description: "SKILL.md has no numbered steps; procedures go to usecases" },
  create: (context) => ({
    document: (): void => {
      const max = numberOption({ key: "max", fallback: ORDERED_MAX })(context);
      for (const heading of pipe(
        subHeadingsOf(context),
        Arr.filter(({ text }) => isStepHeading.test(text)),
      )) {
        context.report({ node: heading.node, message: "Move numbered steps to a use case" });
      }
      const lists = pipe(
        descendants(context.root),
        Arr.filter((node) => node.type === "list" && node.data["ordered"] === true),
        Arr.filter((node) => node.children.length > max),
      );
      for (const node of lists) {
        context.report({
          node,
          message: `Ordered list of more than ${String(max)} steps; move it to a use case`,
        });
      }
    },
  }),
});

export const skillNoTimeSensitive: Rule = defineRule({
  meta: { description: "SKILL.md has no wording that expires" },
  create: (context) => ({
    document: (): void => {
      const found = pipe(
        proseNodes(context),
        Arr.filter((node) => EXPIRING.test(context.textOf(node))),
      );
      for (const node of found) {
        context.report({ node, message: "This wording expires; state what holds without a date" });
      }
    },
  }),
});
