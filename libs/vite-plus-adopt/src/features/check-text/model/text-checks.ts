import { Effect, Array as Arr, String as Str, pipe } from "effect";

import { withSection } from "#/entities/check/index.ts";
import { listCommitMessages, listGitFiles } from "#/shared/lib/git.ts";
import type { Report } from "#/shared/lib/report.ts";

import { lintCommitMessages } from "./commitlint.ts";
import { lintMarkdown } from "./markdownlint.ts";
import { lintTexts } from "./textlint.ts";

const MARKDOWN = "*.md";

const GLOB_PATHSPEC = ":(glob)";

const markdownFiles = (
  root: string,
  ignores: readonly string[] = [],
): ReturnType<typeof listGitFiles> =>
  listGitFiles(root, [
    MARKDOWN,
    ...pipe(
      ignores,
      Arr.map((glob) => `:(glob,exclude)${glob}`),
    ),
  ]);

const sourceFiles = (root: string, files: readonly string[]): ReturnType<typeof listGitFiles> =>
  listGitFiles(
    root,
    pipe(
      files,
      Arr.map((glob) => `${GLOB_PATHSPEC}${glob}`),
    ),
  );

const mergeReports = (reports: readonly Report[]): Report => ({
  valid: pipe(
    reports,
    Arr.every((report) => report.valid),
  ),
  output: pipe(
    reports,
    Arr.map((report) => report.output),
    Arr.filter(Str.isNonEmpty),
    Arr.join("\n"),
  ),
});

/** @internal */
export const textlintCheck = withSection("textlint", (config, { root }) => {
  const markdown = markdownFiles(root, config.ignores).pipe(
    Effect.flatMap((files) => lintTexts(config, root, files)),
  );
  const presets = config.presets ?? {};
  const sources = pipe(
    config.sources ?? [],
    Arr.map(({ files, ...source }) =>
      Effect.flatMap(sourceFiles(root, files), (listed) =>
        lintTexts({ ...source, presets }, root, listed),
      ),
    ),
  );
  return Effect.all([markdown, ...sources], { concurrency: 1 }).pipe(Effect.map(mergeReports));
});

/** @internal */
export const markdownlintCheck = withSection("markdownlint", (config, { root }) =>
  markdownFiles(root, config.ignores).pipe(
    Effect.flatMap((files) => lintMarkdown(config, root, files)),
  ),
);

/** @internal */
export const commitlintCheck = withSection("commitlint", (config, { root, range }) =>
  listCommitMessages(root, range).pipe(
    Effect.flatMap((messages) => lintCommitMessages(config, root, messages)),
  ),
);
