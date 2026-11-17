import { defineRule } from "@r_masseater/y8";
import type { MarkdownNode, Report, Rule, RuleContext } from "@r_masseater/y8";
import { Array as Arr, Option, Predicate, String as Str, pipe } from "effect";

import { descendants, proseNodes, skillNamesIn } from "./markdown.ts";
import { stringOption, stringsOption } from "./options.ts";

const HYPHEN = "-";
const SPECIAL = /[.*+?^${}()|[\]\\]/gu;
const BACKTICKS = /`/gu;

const patternOf = (name: string): RegExp => {
  const escaped = Str.replaceAll(SPECIAL, String.raw`\$&`)(name);
  return pipe(
    Option.liftPredicate(name, Str.includes(HYPHEN)),
    Option.match({
      onNone: () => new RegExp(`(?<![\\w-])${escaped}\\s*(?:スキル|skill)`, "iu"),
      onSome: () => new RegExp(`(?<![\\w-])${escaped}(?![\\w-])`, "u"),
    }),
  );
};

const ownName = (context: RuleContext): readonly string[] =>
  pipe(
    Option.fromNullishOr(context.frontmatter),
    Option.flatMap((frontmatter) => Option.fromNullishOr(frontmatter["name"])),
    Option.filter(Predicate.isString),
    Option.toArray,
  );

const namesIn = (context: RuleContext): readonly string[] => {
  const allowed = [...stringsOption({ key: "allow", fallback: [] })(context), ...ownName(context)];
  return pipe(
    [...stringsOption({ key: "names", fallback: [] })(context), ...skillNamesIn(context)],
    Arr.dedupe,
    Arr.filter((name) => !Arr.contains(allowed, name)),
  );
};

const isIndex = (context: RuleContext): boolean =>
  pipe(
    Option.all({
      index: stringOption("index")(context),
      frontmatter: Option.fromNullishOr(context.frontmatter),
    }),
    Option.exists(({ index, frontmatter }) => frontmatter["name"] === index),
  );

const messageOf = (name: string): string =>
  `Names the skill ${name}; let the index skill choose skills`;

const textMentions =
  (context: RuleContext, names: readonly string[]) =>
  (node: MarkdownNode): readonly Report[] =>
    pipe(
      names,
      Arr.filter((name) => patternOf(name).test(context.textOf(node))),
      Arr.map((name): Report => ({ node, message: messageOf(name) })),
    );

const codeMentions =
  (context: RuleContext, names: readonly string[]) =>
  (node: MarkdownNode): readonly Report[] => {
    const text = Str.replaceAll(BACKTICKS, "")(context.textOf(node));
    return pipe(
      Option.liftPredicate(text, (value) => Arr.contains(names, value)),
      Option.map((name): Report => ({ node, message: messageOf(name) })),
      Option.toArray,
    );
  };

const reportsOf = (context: RuleContext): readonly Report[] => {
  const names = namesIn(context);
  const nodes = descendants(context.root);
  return [
    ...pipe(proseNodes(context), Arr.flatMap(textMentions(context, names))),
    ...pipe(
      nodes,
      Arr.filter((node) => node.type === "code"),
      Arr.flatMap(codeMentions(context, names)),
    ),
  ];
};

export const noSkillNames: Rule = defineRule({
  meta: { description: "Only the index skill names other skills" },
  create: (context) => ({
    document: (): void => {
      if (isIndex(context)) {
        return;
      }
      for (const report of reportsOf(context)) {
        context.report(report);
      }
    },
  }),
});
