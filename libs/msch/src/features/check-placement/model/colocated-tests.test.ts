import { layer } from "@effect/vitest";
import { Array as Arr, Effect, pipe } from "effect";
import { expect } from "vite-plus/test";

import { sortProblems } from "#/shared/lib/problem.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";
import { fixtureLayer, gitRepositoryWith } from "#/shared/lib/repository.test.support.ts";

import { checkColocatedTests } from "./colocated-tests.ts";

const findingsFor = Effect.fn("findingsFor")(function* findingsFor(
  files: Readonly<Record<string, string>>,
) {
  const repositoryFiles = yield* RepositoryFiles;
  const root = yield* gitRepositoryWith(files);
  const problems = yield* checkColocatedTests(root);
  return pipe(
    sortProblems(problems),
    Arr.map((problem) => `${repositoryFiles.relative(root, problem.file)} ${problem.rule}`),
  );
});

const flagsDistantTests = Effect.gen(function* flagsDistantTests() {
  const findings = yield* findingsFor({
    "apps/site/src/app/translate.test.ts": 'import { TranslatorPage } from "#/pages/translator";\n',
    "apps/site/src/app/__tests__/mount.tsx": "export const mount = 1;\n",
    "apps/site/src/pages/translator/index.ts": 'export { TranslatorPage } from "./ui/page.tsx";\n',
    "libs/kit/tests/parse.test.ts": 'import { parse } from "../src/parse.ts";\n',
    "libs/kit/spec/parse.spec.ts": 'import { parse } from "../src/parse.ts";\n',
    "libs/kit/src/other-test.test.ts": 'import { cases } from "./parse.test.ts";\n',
    "libs/trace/package.json": '{"name":"trace","exports":{"./spans":"./src/spans.ts"}}\n',
    "libs/trace/src/spans.ts": "export const spans = 1;\n",
    "libs/trace/src/lib/format.test.ts": 'import { spans } from "trace/spans";\n',
  });
  expect(findings).toStrictEqual([
    "apps/site/src/app/__tests__/mount.tsx colocated-test",
    "apps/site/src/app/translate.test.ts colocated-test",
    "libs/kit/spec/parse.spec.ts colocated-test",
    "libs/kit/src/other-test.test.ts colocated-test",
    "libs/kit/tests/parse.test.ts colocated-test",
    "libs/trace/src/lib/format.test.ts colocated-test",
  ]);
});

const passesColocatedTests = Effect.gen(function* passesColocatedTests() {
  const findings = yield* findingsFor({
    ".gitattributes": "upstream/** linguist-vendored\n",
    "apps/site/src/pages/translator/ui/page.tsx": "export const TranslatorPage = 1;\n",
    "apps/site/src/pages/translator/ui/page.test.tsx":
      'import { mount } from "./page.test.support.tsx";\nimport { TranslatorPage } from "./page.tsx";\n',
    "apps/site/src/pages/translator/ui/page.test.support.tsx": "export const mount = 1;\n",
    "libs/kit/src/parse.test.ts": 'vi.mock("./read.ts");\nawait import("./parse.ts");\n',
    "app/mcp/tools.search.test.ts": 'import { tokens } from "./search-tools.test.support.ts";\n',
    "upstream/tests/vendored.test.ts": 'import { a } from "../a.ts";\n',
    "crates/engine/tests/render.rs": "fn main() {}\n",
    "libs/trace/package.json": '{"name":"trace","exports":{"./spans":"./src/spans.ts"}}\n',
    "libs/trace/src/spans.ts": "export const spans = 1;\n",
    "libs/trace/src/spans.test.ts": 'import { spans } from "trace/spans";\n',
    "libs/flow/src/main.test.ts": 'const entry = path.join(import.meta.dirname, "main.ts");\n',
    "apps/demo/declarations.test.ts": 'const sources = import.meta.glob("./src/**/*.rpp");\n',
    "apps/sdd/src/features/specs/Dashboard.tsx": "export const Dashboard = 1;\n",
    "plugins/sdd/skills/spec/scripts/copy.ts": "export const copy = 1;\n",
    "plugins/sdd/skills/spec/scripts/copy.test.ts": 'import { copy } from "./copy.ts";\n',
  });
  expect(findings).toStrictEqual([]);
});

layer(fixtureLayer)("colocated tests", (it) => {
  it.effect(
    "flags tests that refer to nothing but other tests in their own directory, and files in separate test directories",
    () => flagsDistantTests,
  );
  it.effect(
    "passes tests that import, name or reach through their package's exports a file beside them, vendored files, Rust integration tests and modules in a directory named after specs",
    () => passesColocatedTests,
  );
});
