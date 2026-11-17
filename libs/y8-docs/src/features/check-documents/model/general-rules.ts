import { defineRule } from "@r_masseater/y8";
import type { MarkdownNode, Rule } from "@r_masseater/y8";
import { Array as Arr, Option, String as Str, pipe } from "effect";

import {
  destinationOf,
  isExternal,
  linksOf,
  localTargetOf,
  proseNodes,
} from "#/features/check-documents/lib/markdown.ts";
import { stringsOption } from "#/features/check-documents/lib/options.ts";

const BACKSLASH = "\\";
const NEXT_LINE = 1;
const LOCAL_PATH = /(?:^|[\s`'"(<[])(?:\/home\/[^/\s]+\/|\/Users\/[^/\s]+\/|[A-Za-z]:\\Users\\)/u;
const EMAIL = /[\w.%+-]+@[a-z\d-]+(?:\.[a-z\d-]+)*\.[a-z]{2,}/giu;
const PLACEHOLDER = /\b(?:TODO|FIXME|TBD|WIP)\b|\bcoming soon\b/u;
const DEFAULT_ALLOWED_EMAILS: readonly string[] = ["git@github.com", "noreply@anthropic.com"];

const allowedEmails = stringsOption({ key: "allow", fallback: DEFAULT_ALLOWED_EMAILS });

export const linkTargetExists: Rule = defineRule({
  meta: { description: "A relative link or image points to a file in the repository" },
  create: (context) => ({
    document: (): void => {
      for (const node of linksOf(context)) {
        for (const target of Option.toArray(localTargetOf(context)(node))) {
          if (!context.exists(target)) {
            context.report({ node, message: `Link target ${target} does not exist` });
          }
        }
      }
    },
  }),
});

const hasBackslash = (node: MarkdownNode): boolean =>
  pipe(
    destinationOf(node),
    Option.exists(
      (destination) => !isExternal(destination) && Str.includes(BACKSLASH)(destination),
    ),
  );

export const linkForwardSlash: Rule = defineRule({
  meta: { description: "Link paths use forward slashes" },
  create: (context) => ({
    document: (): void => {
      for (const node of pipe(linksOf(context), Arr.filter(hasBackslash))) {
        context.report({ node, message: String.raw`Use / instead of \ in link paths` });
      }
    },
  }),
});

export const noLocalPath: Rule = defineRule({
  meta: { description: "No absolute path from a personal machine" },
  create: (context) => ({
    document: (): void => {
      for (const [index, line] of context.lines.entries()) {
        if (LOCAL_PATH.test(line)) {
          context.report({
            line: index + NEXT_LINE,
            message: "Absolute path from a personal machine; use a path relative to the repository",
          });
        }
      }
    },
  }),
});

const emailsIn = (text: string): readonly string[] =>
  pipe(
    Arr.fromIterable(Str.matchAll(EMAIL)(text)),
    Arr.map(([match]) => match),
  );

export const noEmail: Rule = defineRule({
  meta: { description: "No email addresses" },
  create: (context) => ({
    document: (): void => {
      const allowed = allowedEmails(context);
      for (const [index, line] of context.lines.entries()) {
        const found = pipe(
          emailsIn(line),
          Arr.filter((email) => !Arr.contains(allowed, Str.toLowerCase(email))),
        );
        for (const email of found) {
          context.report({
            line: index + NEXT_LINE,
            message: `Email address ${email}; refer to the person another way`,
          });
        }
      }
    },
  }),
});

export const noPlaceholder: Rule = defineRule({
  meta: { description: "No TODO, FIXME, TBD, WIP or coming soon outside code" },
  create: (context) => ({
    document: (): void => {
      const found = pipe(
        proseNodes(context),
        Arr.filter((node) => {
          const text = context.textOf(node);
          return PLACEHOLDER.test(text);
        }),
      );
      for (const node of found) {
        context.report({ node, message: "Placeholder text; open an issue for unfinished work" });
      }
    },
  }),
});
