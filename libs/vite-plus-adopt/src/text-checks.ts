import { Effect, Array as Arr, pipe } from "effect";

import { lintCommitMessages } from "./commitlint.ts";
import { listCommitMessages, listGitFiles } from "./git.ts";
import { lintMarkdown } from "./markdownlint.ts";
import { withSection } from "./section-check.ts";
import { lintTexts } from "./textlint.ts";

const MARKDOWN = "*.md";

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

const textlintCheck = withSection("textlint", (config, { root }) =>
  markdownFiles(root, config.ignores).pipe(
    Effect.flatMap((files) => lintTexts(config, root, files)),
  ),
);

const markdownlintCheck = withSection("markdownlint", (config, { root }) =>
  markdownFiles(root, config.ignores).pipe(
    Effect.flatMap((files) => lintMarkdown(config, root, files)),
  ),
);

const commitlintCheck = withSection("commitlint", (config, { root, base }) =>
  listCommitMessages(root, `${base}..HEAD`).pipe(
    Effect.flatMap((messages) => lintCommitMessages(config, root, messages)),
  ),
);

export { commitlintCheck, markdownlintCheck, textlintCheck };
