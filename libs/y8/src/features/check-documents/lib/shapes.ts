import { Array as Arr, Option, String as Str, pipe } from "effect";

import { defineRule } from "#/entities/rule/index.ts";
import type { Rule, RuleContext } from "#/shared/config/index.ts";

import { proseNodes, subHeadingsOf, titleOf } from "./markdown.ts";
import { numberOption } from "./options.ts";

const NEXT_LINE = 1;
const SHOUTING = /\b(?:MUST|CRITICAL|MANDATORY|IMPORTANT)\b/u;

export interface BannedHeading {
  readonly pattern: RegExp;
  readonly description: string;
  readonly message: string;
}

export const bannedHeading = ({ pattern, description, message }: BannedHeading): Rule =>
  defineRule({
    meta: { description },
    create: (context) => ({
      document: (): void => {
        const found = pipe(
          subHeadingsOf(context),
          Arr.filter(({ text }) => pattern.test(text)),
        );
        for (const heading of found) {
          context.report({ node: heading.node, message: `${heading.text}: ${message}` });
        }
      },
    }),
  });

export interface MaxLines {
  readonly fallback: number;
  readonly description: string;
}

export const maxLines = ({ fallback, description }: MaxLines): Rule =>
  defineRule({
    meta: { description },
    create: (context) => ({
      document: (): void => {
        const max = numberOption({ key: "max", fallback })(context);
        const count = pipe(context.lines, Arr.reverse, Arr.dropWhile(Str.isEmpty)).length;
        if (count > max) {
          context.report({
            line: max + NEXT_LINE,
            message: `${String(count)} lines; keep it within ${String(max)}`,
          });
        }
      },
    }),
  });

export const noShouting: Rule = defineRule({
  meta: { description: "No MUST, CRITICAL, MANDATORY or IMPORTANT in capitals as emphasis" },
  create: (context) => ({
    document: (): void => {
      const found = pipe(
        proseNodes(context),
        Arr.filter((node) => SHOUTING.test(context.textOf(node))),
      );
      for (const node of found) {
        context.report({
          node,
          message: "Write the instruction plainly without capitals for emphasis",
        });
      }
    },
  }),
});

export interface TitleRule {
  readonly description: string;
  readonly expected: (context: RuleContext) => Option.Option<string>;
}

export const titleRule = ({ description, expected }: TitleRule): Rule =>
  defineRule({
    meta: { description },
    create: (context) => ({
      document: (): void => {
        const title = titleOf(context);
        if (Option.isNone(title)) {
          context.report({ line: NEXT_LINE, message: "Start with a level 1 title" });
          return;
        }
        for (const name of Option.toArray(expected(context))) {
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
