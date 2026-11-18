import { defineRule } from "@r_masseater/y8";
import type { MarkdownNode, Rule, RuleContext } from "@r_masseater/y8";
import { Array as Arr, Option, Predicate, String as Str, pipe } from "effect";

import {
  descendants,
  directoryOf,
  joinPath,
  normalized,
} from "#/features/check-documents/lib/markdown.ts";

const BACKTICKS = /^`+|`+$/gu;
const NOT_A_PATH = /[\s<>*{}$~:@#?=,;'"|\\]/u;
const NESTED = /[^/]\/[^/]/u;
const SEPARATOR = "/";
const EXPORT_PREFIX = "./";
const ROOT = "";
const FROM_ROOT = "fromRoot";

const spanText =
  (context: RuleContext) =>
  (node: MarkdownNode): string =>
    Str.replaceAll(BACKTICKS, "")(context.textOf(node));

const looksLikePath = (text: string): boolean =>
  NESTED.test(text) &&
  !NOT_A_PATH.test(text) &&
  !Str.startsWith(SEPARATOR)(text) &&
  !Str.startsWith(EXPORT_PREFIX)(text);

const fromRoot = (context: RuleContext): boolean =>
  pipe(
    Option.fromNullishOr(context.options[FROM_ROOT]),
    Option.filter(Predicate.isBoolean),
    Option.getOrElse(() => true),
  );

const basesOf = (context: RuleContext): readonly string[] => {
  const own = directoryOf(context.filename);
  if (fromRoot(context) && own !== ROOT) {
    return [own, ROOT];
  }
  return [own];
};

const firstSegment = (path: string): string =>
  pipe(
    Str.split(path, SEPARATOR),
    Arr.head,
    Option.getOrElse(() => path),
  );

const resolvedIn =
  (context: RuleContext, path: string) =>
  (base: string): Option.Option<string> => {
    const start = joinPath(base, firstSegment(path));
    return pipe(
      normalized(start),
      Option.filter(context.exists),
      Option.flatMap(() => normalized(joinPath(base, path))),
    );
  };

export const codePathExists: Rule = defineRule({
  meta: {
    description:
      "A path in a code span that starts at an existing directory points to a file or directory in the repository",
  },
  create: (context) => ({
    document: (): void => {
      const spans = pipe(
        descendants(context.root),
        Arr.filter((node) => node.type === "code"),
        Arr.map((node) => ({ node, path: spanText(context)(node) })),
        Arr.filter(({ path }) => looksLikePath(path)),
      );
      for (const { node, path } of spans) {
        const candidates = pipe(
          basesOf(context),
          Arr.flatMap((base) => Option.toArray(resolvedIn(context, path)(base))),
        );
        if (
          Arr.isReadonlyArrayNonEmpty(candidates) &&
          !pipe(candidates, Arr.some(context.exists))
        ) {
          context.report({ node, message: `Path ${path} does not exist` });
        }
      }
    },
  }),
});
