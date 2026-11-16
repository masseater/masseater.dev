import { NodeServices } from "@effect/platform-node";
import { layer } from "@effect/vitest";
import { assertInclude, deepStrictEqual, strictEqual } from "@effect/vitest/utils";
import { Array as Arr, Effect, Option, Order, String as Str, pipe } from "effect";

import type { RuleContext } from "#/entities/decision/index.ts";

import {
  FAILED,
  PASSED,
  TIMEOUT,
  callRule,
  lintProject,
  modelOf,
  outputOf,
  questionCount,
  withMock,
} from "./fixtures.test.support.ts";
import { loggedRequests } from "./mock-typesafe.test.support.ts";
import type { LoggedRequest } from "./mock-typesafe.test.support.ts";
import { decisionLines, mockEnv } from "./oxlint.test.support.ts";
import type { Services, TestError } from "./oxlint.test.support.ts";
import { toJson } from "./presets-oxlint.test.support.ts";

const ONE = 1;
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
  const sent = pipe(
    requests,
    Arr.map(({ body }) => toJson(body)),
    Arr.join("\n"),
  );
  assertInclude(sent, "f<T>(x)");
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
    options: { model: ["typesafe/jev-latest", "typesafe/jev-1.2"], rules: [callRule] },
    env,
  });
  const requests = yield* loggedRequests;
  deepStrictEqual(sortedModels(requests), ["jev-1.2", "jev-latest"]);
  deepStrictEqual(
    pipe(
      decisionLines(run),
      Arr.map((line) => Str.replace(/ answered.*/u, "")(line)),
    ),
    ["log.js:1:1: [any-call] typesafe/mock-decider", "log.js:1:1: [any-call] typesafe/mock-second"],
  );
});

const ruleModel = Effect.gen(function* test() {
  const env = yield* mockEnv("test-key");
  yield* lintProject({
    files: { "log.js": LOG_LINE },
    options: { model: "typesafe/jev-latest", rules: [{ ...callRule, model: "typesafe/jev-1.2" }] },
    env,
  });
  const requests = yield* loggedRequests;
  deepStrictEqual(sortedModels(requests), ["jev-1.2"]);
});

const renamedEnv = Effect.gen(function* test() {
  const { TYPESAFE_API_KEY: key, TYPESAFE_BASE_URL: url } = yield* mockEnv("team-key");
  const files = { "log.js": LOG_LINE };
  const options = {
    env: { TYPESAFE_API_KEY: "TEAM_TYPESAFE_KEY", TYPESAFE_BASE_URL: "TEAM_TYPESAFE_URL" },
    rules: [callRule],
  };
  const without = yield* lintProject({ files, options, env: { TYPESAFE_API_KEY: "ignored" } });
  assertInclude(without.stderr, "TEAM_TYPESAFE_KEY is not set, skipping typesafe models");
  const run = yield* lintProject({
    files,
    options,
    env: { TEAM_TYPESAFE_KEY: String(key), TEAM_TYPESAFE_URL: String(url) },
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

layer(NodeServices.layer, { excludeTestServices: true })("linting a project", (it) => {
  it.effect(
    "asks about the match that only one parse of the same text has",
    () => withMock(askedTwins),
    TIMEOUT,
  );
  it.effect("sends every match in a file without a cap", () => withMock(uncapped), TIMEOUT);
  it.effect(
    "reports each model's yes as its own diagnostic, one request per model",
    () => withMock(perModel),
    TIMEOUT,
  );
  it.effect("lets a rule override the default model", () => withMock(ruleModel), TIMEOUT);
  it.effect("sends the source a rule's context scope asks for", () => contexts, TIMEOUT);
  it.effect(
    "reads the key and base URL from the variables env names",
    () => withMock(renamedEnv),
    TIMEOUT,
  );
});
