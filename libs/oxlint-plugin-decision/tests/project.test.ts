import { NodeServices } from "@effect/platform-node";
import { layer } from "@effect/vitest";
import { assertInclude, deepStrictEqual, strictEqual } from "@effect/vitest/utils";
import { Array as Arr, Effect, Option, Order, String as Str, pipe } from "effect";

import { toJson } from "#src/runtime.ts";
import type { RuleContext } from "#src/types.ts";

import {
  FAILED,
  PASSED,
  RESPAN,
  TIMEOUT,
  callRule,
  lintProject,
  modelOf,
  outputOf,
  questionCount,
  withMock,
} from "./fixtures.ts";
import { loggedRequests } from "./mock-openrouter.ts";
import type { LoggedRequest } from "./mock-openrouter.ts";
import { decisionLines, mockEnv } from "./oxlint.ts";
import type { Services, TestError } from "./oxlint.ts";

const ONE = 1;
const TWO = 2;
const THREE = 3;
const ROWS = 30;
const LOG_LINE = "console.log(user.email, user.phone);\n";
const AROUND =
  "const before = 1;\nfunction handler() {\n  console.log(user.email, user.phone);\n}\n";

const askedTwins = Effect.gen(function* test() {
  const text = "first();\nf<T>(x);\nlast();\n";
  const env = yield* mockEnv("test-key");
  const run = yield* lintProject({
    files: { "same.js": text, "same.ts": text },
    options: { rules: [callRule] },
    env,
  });
  strictEqual(run.status, PASSED, outputOf(run));
  const requests = yield* loggedRequests;
  const counts = pipe(
    requests,
    Arr.map((request) => questionCount(request)),
  );
  deepStrictEqual(Arr.sort(counts, Order.Number), [TWO, THREE]);
});

const uncapped = Effect.gen(function* test() {
  const rows = pipe(
    Arr.replicate('console.log("row", user.email, user.phone);', ROWS),
    Arr.join("\n"),
  );
  const env = yield* mockEnv("test-key");
  const run = yield* lintProject({
    files: { "rows.js": `${rows}\n` },
    options: { rules: [callRule] },
    env,
  });
  const requests = yield* loggedRequests;
  deepStrictEqual(
    pipe(
      requests,
      Arr.map((request) => questionCount(request)),
    ),
    [ROWS],
  );
  strictEqual(decisionLines(run).length, ROWS);
  strictEqual(run.status, FAILED);
});

const sortedModels = (requests: readonly LoggedRequest[]): readonly string[] =>
  pipe(
    requests,
    Arr.map((request) => modelOf(request)),
    (sorted) => Arr.sort(sorted, Order.String),
  );

const perModel = Effect.gen(function* test() {
  const env = yield* mockEnv("test-key");
  const run = yield* lintProject({
    files: { "log.js": LOG_LINE },
    options: { model: ["openrouter/first", "openrouter/second"], rules: [callRule] },
    env,
  });
  const requests = yield* loggedRequests;
  deepStrictEqual(sortedModels(requests), ["first", "second"]);
  deepStrictEqual(
    pipe(
      decisionLines(run),
      Arr.map((line) => Str.replace(/ answered.*/u, "")(line)),
    ),
    [
      "log.js:1:1: [any-call] openrouter/mock-decider",
      "log.js:1:1: [any-call] openrouter/mock-second",
    ],
  );
});

const ruleModel = Effect.gen(function* test() {
  const env = yield* mockEnv("test-key");
  yield* lintProject({
    files: { "log.js": LOG_LINE },
    options: { model: "openrouter/first", rules: [{ ...callRule, model: "openrouter/second" }] },
    env,
  });
  const requests = yield* loggedRequests;
  deepStrictEqual(sortedModels(requests), ["second"]);
});

const textState = Effect.gen(function* test() {
  const env = yield* mockEnv("test-key");
  const run = yield* lintProject({
    files: { "log.js": LOG_LINE },
    options: { model: RESPAN, rules: [callRule] },
    env,
  });
  const requests = yield* loggedRequests;
  deepStrictEqual(
    pipe(
      requests,
      Arr.map(({ sentState }) => sentState),
    ),
    ["state.snippets.s0:\nconsole.log(user.email, user.phone)"],
  );
  strictEqual(decisionLines(run).length, ONE);
});

const textStatePerSnippet = Effect.gen(function* test() {
  const env = yield* mockEnv("test-key");
  const run = yield* lintProject({
    files: { "log.js": `${LOG_LINE}console.log("done");\n` },
    options: { model: RESPAN, rules: [callRule] },
    env,
  });
  const requests = yield* loggedRequests;
  deepStrictEqual(
    pipe(
      requests,
      Arr.map(({ sentState }) => toJson(sentState)),
      (sorted) => Arr.sort(sorted, Order.String),
    ),
    [
      toJson("state.snippets.s0:\nconsole.log(user.email, user.phone)"),
      toJson('state.snippets.s1:\nconsole.log("done")'),
    ],
  );
  strictEqual(decisionLines(run).length, ONE);
});

const renamedEnv = Effect.gen(function* test() {
  const { OPENROUTER_API_KEY: key, OPENROUTER_BASE_URL: url } = yield* mockEnv("team-key");
  const files = { "log.js": LOG_LINE };
  const options = {
    env: { OPENROUTER_API_KEY: "TEAM_OPENROUTER_KEY", OPENROUTER_BASE_URL: "TEAM_OPENROUTER_URL" },
    rules: [callRule],
  };
  const without = yield* lintProject({ files, options, env: { OPENROUTER_API_KEY: "ignored" } });
  assertInclude(without.stderr, "TEAM_OPENROUTER_KEY is not set, skipping openrouter models");
  const run = yield* lintProject({
    files,
    options,
    env: { TEAM_OPENROUTER_KEY: String(key), TEAM_OPENROUTER_URL: String(url) },
  });
  const requests = yield* loggedRequests;
  deepStrictEqual(
    pipe(
      requests,
      Arr.map(({ authorization }) => authorization),
    ),
    ["Bearer team-key"],
  );
  strictEqual(decisionLines(run).length, ONE);
});

const contextFor = (
  context: RuleContext,
  source = AROUND,
): Effect.Effect<Option.Option<string>, TestError, Services> =>
  withMock(
    Effect.gen(function* ask() {
      const env = yield* mockEnv("test-key");
      yield* lintProject({
        files: { "log.js": source },
        options: { rules: [{ ...callRule, context }] },
        env,
      });
      const requests = yield* loggedRequests;
      return Arr.head(requests).pipe(
        Option.flatMap(({ body }) => Option.fromUndefinedOr(body.state.contexts)),
        Option.flatMap((contexts) => Option.fromUndefinedOr(contexts["s0"])),
      );
    }),
  );

const contexts = Effect.gen(function* test() {
  const context = yield* contextFor({ scope: "node" });
  deepStrictEqual(context, Option.none());
  const context2 = yield* contextFor({ scope: "lines", before: ONE, after: ONE });
  deepStrictEqual(
    context2,
    Option.some("L2| function handler() {\nL3|   console.log(user.email, user.phone);\nL4| }"),
  );
  const context3 = yield* contextFor({ scope: "enclosing", kind: "function" });
  deepStrictEqual(
    context3,
    Option.some("function handler() {\n  console.log(user.email, user.phone);\n}"),
  );
  const context4 = yield* contextFor({ scope: "file" });
  deepStrictEqual(context4, Option.some(AROUND));
  const context5 = yield* contextFor(
    { scope: "lines", before: ONE, after: ONE },
    Str.replaceAll("\n", "\r")(AROUND),
  );
  deepStrictEqual(
    context5,
    Option.some("L2| function handler() {\nL3|   console.log(user.email, user.phone);\nL4| }"),
  );
});

const attributed = Effect.gen(function* test() {
  const env = yield* mockEnv("test-key");
  yield* lintProject({
    files: { "log.js": LOG_LINE },
    options: { rules: [callRule] },
    env: { ...env, GITHUB_ACTIONS: "true", GITHUB_REPOSITORY: "acme/app" },
  });
  const requests = yield* loggedRequests;
  deepStrictEqual(
    pipe(
      requests,
      Arr.map(({ app }) => app),
    ),
    [
      {
        referer: "https://github.com/acme/app/oxlint-plugin-decision/github-actions",
        title: "acme/app github-actions oxlint-plugin-decision",
        visibility: "hidden",
      },
    ],
  );
});

const fromRemote = Effect.gen(function* test() {
  const env = yield* mockEnv("test-key");
  yield* lintProject({
    files: {
      "log.js": LOG_LINE,
      ".git": "gitdir: .\n",
      config: '[core]\n\tbare = false\n[remote "origin"]\n\turl = git@github.com:acme/tool.git\n',
    },
    options: { rules: [callRule] },
    env: { ...env, CLAUDECODE: "1" },
  });
  const requests = yield* loggedRequests;
  deepStrictEqual(
    pipe(
      requests,
      Arr.map(({ app }) => app.title),
    ),
    ["acme/tool claude-code oxlint-plugin-decision"],
  );
});

layer(NodeServices.layer, { excludeTestServices: true })("linting a project", (it) => {
  it.effect(
    "asks separately about files with the same text but different parses",
    () => withMock(askedTwins),
    TIMEOUT,
  );
  it.effect("sends every match in a file without a cap", () => withMock(uncapped), TIMEOUT);
  it.effect(
    "reports each model's yes as its own diagnostic, one request per model",
    () => withMock(perModel),
    TIMEOUT,
  );
  it.effect("sends Respan models their state as text", () => withMock(textState), TIMEOUT);
  it.effect(
    "asks Respan models about one snippet per request",
    () => withMock(textStatePerSnippet),
    TIMEOUT,
  );
  it.effect("lets a rule override the default model", () => withMock(ruleModel), TIMEOUT);
  it.effect("sends the source a rule's context scope asks for", () => contexts, TIMEOUT);
  it.effect(
    "reads the key and base URL from the variables env names",
    () => withMock(renamedEnv),
    TIMEOUT,
  );
  it.effect(
    "names the repository and where it runs as a hidden OpenRouter app",
    () => withMock(attributed),
    TIMEOUT,
  );
  it.effect("reads the repository from the origin remote", () => withMock(fromRemote), TIMEOUT);
});
