import { Array as Arr, Option, Predicate, String as Str, pipe } from "effect";
import { minimatch } from "minimatch";

import { defineRule } from "#/entities/rule/index.ts";
import {
  descendants,
  destinationOf,
  directoryOf,
  isExternal,
  isPublished,
  joinPath,
  leadingBlocks,
  linksOf,
  localTargetOf,
  plainText,
  proseNodes,
  sectionsOf,
  sentenceCount,
  titleOf,
} from "#/features/check-documents/lib/markdown.ts";
import type { Section } from "#/features/check-documents/lib/markdown.ts";
import { numberOption } from "#/features/check-documents/lib/options.ts";
import { bannedHeading, maxLines } from "#/features/check-documents/lib/shapes.ts";
import type { MarkdownNode, PackageManifest, Rule, RuleContext } from "#/shared/config/index.ts";

const SUMMARY_SENTENCES = 2;
const README_LINES = 150;
const ONE = 1;
const SEPARATOR = "/";
const DOCS_LINK = /doc|guide|ドキュメント/iu;
const SKILLS_HEADING = /skill|スキル/iu;
const SKILL_FILE = /(?:^|\/)SKILL\.md$/u;
const PROJECT_DOCS =
  /^(?:contribut\w*|changelog|change log|security|code of conduct|貢献|コントリビュー\w*|変更履歴|セキュリティ|行動規範)$/iu;
const ALWAYS_SHIPPED = /^(?:package\.json|readme[^/]*|license[^/]*|licence[^/]*)$/iu;
const SUMMARY_TYPES: readonly string[] = ["paragraph"];

const ownManifest = (context: RuleContext): Option.Option<PackageManifest> =>
  pipe(
    Option.fromNullishOr(context.manifest),
    Option.filter((manifest) => manifest.directory === directoryOf(context.filename)),
  );

const publishedManifest = (context: RuleContext): Option.Option<PackageManifest> =>
  pipe(
    ownManifest(context),
    Option.filter(({ data }) => isPublished(data)),
  );

const nameOf = (manifest: PackageManifest): Option.Option<string> =>
  pipe(Option.fromNullishOr(manifest.data["name"]), Option.filter(Predicate.isString));

export const readmeTitle: Rule = defineRule({
  meta: { description: "A README opens with one title, which is the package name when published" },
  create: (context) => ({
    document: (): void => {
      const title = titleOf(context);
      if (Option.isNone(title)) {
        context.report({ line: ONE, message: "Start the README with a level 1 title" });
        return;
      }
      for (const name of Option.toArray(Option.flatMap(publishedManifest(context), nameOf))) {
        if (title.value.text !== name) {
          context.report({
            node: title.value.node,
            message: `The title ${title.value.text} is not the package name ${name}`,
          });
        }
      }
    },
  }),
});

export const readmeSummary: Rule = defineRule({
  meta: { description: "One or two sentences right after the title say what the package is" },
  create: (context) => ({
    document: (): void => {
      if (Option.isNone(titleOf(context))) {
        return;
      }
      const max = numberOption({ key: "sentences", fallback: SUMMARY_SENTENCES })(context);
      const next = pipe(
        leadingBlocks(context),
        Arr.drop(ONE),
        Arr.dropWhile((node) => node.type === "blockQuote"),
        Arr.head,
      );
      const isSummary = pipe(
        next,
        Option.exists(
          (node) =>
            Arr.contains(SUMMARY_TYPES, node.type) &&
            sentenceCount(plainText(context)(node)) <= max,
        ),
      );
      if (!isSummary) {
        context.report({
          line: ONE,
          message: `Put a summary of at most ${String(max)} sentences right after the title`,
        });
      }
    },
  }),
});

const isDocsLink =
  (context: RuleContext) =>
  (node: MarkdownNode): boolean =>
    node.type === "link" &&
    pipe(
      destinationOf(node),
      Option.exists(
        (destination) =>
          isExternal(destination) &&
          (DOCS_LINK.test(destination) || DOCS_LINK.test(plainText(context)(node))),
      ),
    );

export const readmeUsage: Rule = defineRule({
  meta: {
    description: "A published README shows how to start: a code block or a link to the docs",
  },
  create: (context) => ({
    document: (): void => {
      const nodes = descendants(context.root);
      const hasCode = pipe(
        nodes,
        Arr.some((node) => node.type === "codeBlock"),
      );
      const hasDocs = pipe(nodes, Arr.some(isDocsLink(context)));
      if (Option.isSome(publishedManifest(context)) && !hasCode && !hasDocs) {
        context.report({
          line: ONE,
          message: "Add a usage example or a link to the documentation",
        });
      }
    },
  }),
});

const shipsSkills = (context: RuleContext, manifest: PackageManifest): boolean =>
  pipe(
    context.filesUnder(joinPath(manifest.directory, "skills")),
    Arr.some((path) => SKILL_FILE.test(path)),
  );

export const readmeAgentSkills: Rule = defineRule({
  meta: { description: "A package that ships agent skills says in its README how to load them" },
  create: (context) => ({
    document: (): void => {
      const missing = pipe(
        publishedManifest(context),
        Option.filter((manifest) => shipsSkills(context, manifest)),
        Option.filter(() =>
          pipe(
            proseNodes(context),
            Arr.every((node) => !SKILLS_HEADING.test(context.textOf(node))),
          ),
        ),
      );
      if (Option.isSome(missing)) {
        context.report({
          line: ONE,
          message: "The package ships agent skills; add a section that says how to load them",
        });
      }
    },
  }),
});

export const readmeApiSection: Rule = bannedHeading({
  pattern:
    /^(?:api|api reference|options|configuration|parameters|props|reference|オプション|設定項目|リファレンス)$/iu,
  description: "A README has no API or option reference that repeats the types",
  message: "README repeats the API; link the types or the docs instead",
});

export const readmeLength: Rule = maxLines({
  fallback: README_LINES,
  description: "A README stays short: the code and the docs hold the details",
});

export const readmeNoToc: Rule = bannedHeading({
  pattern: /^(?:table of contents|contents|toc|目次)$/iu,
  description: "A README has no table of contents",
  message: "GitHub and npm already show an outline of the headings",
});

export const readmeNoFeatureList: Rule = bannedHeading({
  pattern:
    /^(?:features|key features|why\b.*|motivation|benefits|特徴|機能一覧|主な機能|なぜ.*|動機)$/iu,
  description: "A README has no feature, why or motivation section",
  message: "the summary under the title already says what the package is for",
});

export const readmeNoRequirements: Rule = bannedHeading({
  pattern: /^(?:requirements|prerequisites|compatibility|動作環境|必要条件|前提条件|要件)$/iu,
  description: "A README has no requirements section",
  message: "engines and peerDependencies in package.json hold this",
});

export const readmeNoMigration: Rule = bannedHeading({
  pattern: /^(?:migrat\w*.*|upgrad\w*.*|breaking changes|移行.*|アップグレード.*)$/iu,
  description: "A README has no migration section",
  message: "migration is left to the release notes",
});

const linkCount = (section: Section): number =>
  pipe(
    section.blocks,
    Arr.flatMap(descendants),
    Arr.filter((node) => node.type === "link"),
  ).length;

export const readmeNoInlineProjectDocs: Rule = defineRule({
  meta: { description: "Contributing, changelog and security sections hold at most one link" },
  create: (context) => ({
    document: (): void => {
      const found = pipe(
        sectionsOf(context),
        Arr.filter(({ heading }) => PROJECT_DOCS.test(heading.text)),
        Arr.filter((section) => section.blocks.length > ONE || linkCount(section) > ONE),
      );
      for (const section of found) {
        context.report({
          node: section.heading.node,
          message: `${section.heading.text}: link to the file instead of writing it here`,
        });
      }
    },
  }),
});

const filesOf = (manifest: PackageManifest): Option.Option<readonly string[]> =>
  pipe(
    Option.fromNullishOr(manifest.data["files"]),
    Option.filter((value): value is readonly unknown[] => Arr.isArray(value)),
    Option.map(Arr.filter(Predicate.isString)),
  );

const isShipped = (patterns: readonly string[], path: string): boolean =>
  ALWAYS_SHIPPED.test(path) ||
  pipe(
    patterns,
    Arr.some(
      (pattern) =>
        minimatch(path, pattern, { dot: true }) || minimatch(path, `${pattern}/**`, { dot: true }),
    ),
  );

const relativeTo = (directory: string, path: string): Option.Option<string> =>
  pipe(
    Option.liftPredicate(directory, Str.isNonEmpty),
    Option.match({
      onNone: () => Option.some(path),
      onSome: (base) =>
        pipe(
          Option.liftPredicate(path, Str.startsWith(`${base}${SEPARATOR}`)),
          Option.map(Str.slice(base.length + SEPARATOR.length)),
        ),
    }),
  );

export const readmeNoUnshippedLinks: Rule = defineRule({
  meta: { description: "A published README links only files that the package ships" },
  create: (context) => ({
    document: (): void => {
      for (const manifest of Option.toArray(publishedManifest(context))) {
        for (const patterns of Option.toArray(filesOf(manifest))) {
          for (const node of linksOf(context)) {
            const target = pipe(localTargetOf(context)(node), Option.filter(context.exists));
            const unshipped = pipe(
              target,
              Option.filter((path) =>
                pipe(
                  relativeTo(manifest.directory, path),
                  Option.match({
                    onNone: () => true,
                    onSome: (inner) => !isShipped(patterns, inner),
                  }),
                ),
              ),
            );
            for (const path of Option.toArray(unshipped)) {
              context.report({
                node,
                message: `${path} is not in the npm package, so this link breaks on npmjs.com`,
              });
            }
          }
        }
      }
    },
  }),
});
