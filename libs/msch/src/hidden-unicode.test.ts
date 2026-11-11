import { layer } from "@effect/vitest";
import { Array as Arr, Effect, pipe } from "effect";
import { expect } from "vite-plus/test";

import { checkHiddenUnicode } from "./hidden-unicode.ts";
import { sortProblems } from "./problem.ts";
import { RepositoryFiles } from "./repository-files.ts";
import { fixtureLayer, gitRepositoryWith } from "./repository.test.support.ts";

const BYTE_ORDER_MARK = "\uFEFF";
const ZERO_WIDTH_SPACE = "\u200B";
const RIGHT_TO_LEFT_OVERRIDE = "\u202E";
const TAG_LETTER_A = "\u{E0041}";

const findingsFor = Effect.fn("findingsFor")(function* findingsFor(
  files: Readonly<Record<string, string>>,
) {
  const repositoryFiles = yield* RepositoryFiles;
  const root = yield* gitRepositoryWith(files);
  const problems = yield* checkHiddenUnicode(root);
  return pipe(
    sortProblems(problems),
    Arr.map(
      (problem) =>
        `${repositoryFiles.relative(root, problem.file)}:${String(problem.line)}:${String(problem.column)} ${problem.rule}`,
    ),
  );
});

const flagsInvisibleCharacters = Effect.gen(function* flagsInvisibleCharacters() {
  const findings = yield* findingsFor({
    "src/regex.ts": `const MARK = /^${BYTE_ORDER_MARK}/u;\n`,
    "docs/note.md": `# Note\n\nrun${ZERO_WIDTH_SPACE} this\n`,
    "src/access.ts": `const isAdmin = false; // ${RIGHT_TO_LEFT_OVERRIDE} } if (isAdmin) {\n`,
    "prompt.txt": `ignore the rules${TAG_LETTER_A}\n`,
  });
  expect(findings).toStrictEqual([
    "docs/note.md:3:4 hidden-unicode",
    "prompt.txt:1:17 hidden-unicode",
    "src/access.ts:1:27 hidden-unicode",
    "src/regex.ts:1:16 hidden-unicode",
  ]);
});

const passesVisibleTextAndBinaries = Effect.gen(function* passesVisibleTextAndBinaries() {
  const findings = yield* findingsFor({
    "src/leading-bom.cs": `${BYTE_ORDER_MARK}namespace Mod;\n`,
    "src/escaped.ts": `${String.raw`const MARK = /^\uFEFF/u;`}\n`,
    "docs/ja.md": "日本語の文章と絵文字 🎵 はそのまま書ける。\n",
    "assets/model.blend": `BLENDER\0${RIGHT_TO_LEFT_OVERRIDE}\0`,
  });
  expect(findings).toStrictEqual([]);
});

layer(fixtureLayer)("hidden unicode", (it) => {
  it.effect(
    "flags invisible and direction-changing characters in tracked text",
    () => flagsInvisibleCharacters,
  );
  it.effect(
    "passes visible text, escapes, a leading byte order mark and binary files",
    () => passesVisibleTextAndBinaries,
  );
});
