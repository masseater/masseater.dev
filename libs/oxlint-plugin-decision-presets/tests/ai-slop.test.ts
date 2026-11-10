import { NodeServices } from "@effect/platform-node";
import { layer } from "@effect/vitest";
import { assertInclude, deepStrictEqual, strictEqual } from "@effect/vitest/utils";
import {
  Array as Arr,
  Effect,
  FileSystem,
  Option,
  Order,
  Record as Rec,
  String as Str,
  pipe,
} from "effect";
import type { PlatformError } from "effect/PlatformError";

import aiSlopPlugin, { aiSlopRules } from "#src/ai-slop.ts";

import {
  FAILED,
  TIMEOUT,
  configSource,
  enabled,
  fromRoot,
  outputOf,
  oxlint,
  tempProject,
  toJson,
} from "./oxlint.ts";
import type { Services } from "./oxlint.ts";

const AI_SLOP = aiSlopPlugin.meta.name;

const EXAMPLES = ["fail.ts", "pass.ts"] as const;

const alwaysYes = (core: string, entry: string): string => `
import { createDecisionPlugin, defineProvider } from ${toJson(core)};
import { aiSlopRules } from ${toJson(entry)};

const decide = ({ request }) => ({
  ok: true,
  response: {
    model: "fake-1",
    answers: Object.fromEntries(
      Object.keys(request.questions).map((ref) => [ref, { type: "noul", noul: 0.99 }]),
    ),
  },
});

export default createDecisionPlugin({
  name: ${toJson(AI_SLOP)},
  rules: aiSlopRules,
  providers: [defineProvider({ name: "fake", requiredEnv: [], decide })],
});
`;

const COMMENTED = ["pass.ts:28", "pass.ts:51", "fail.ts:27", "fail.ts:39", "fail.ts:60"];

const ASKED: Readonly<Record<string, readonly string[]>> = {
  "cast-instead-of-narrowing": ["fail.ts:55"],
  "comment-narrates-history": COMMENTED,
  "comment-restates-code": COMMENTED,
  "default-masks-missing-value": ["fail.ts:14"],
  "doc-restates-signature": ["pass.ts:34", "fail.ts:51"],
  "pass-through-wrapper": ["fail.ts:19"],
  "placeholder-implementation": [
    "pass.ts:4",
    "pass.ts:16",
    "pass.ts:20",
    "pass.ts:24",
    "pass.ts:28",
    "pass.ts:34",
    "pass.ts:51",
    "pass.ts:56",
    "pass.ts:60",
    "fail.ts:19",
    "fail.ts:23",
    "fail.ts:39",
    "fail.ts:51",
  ],
  "redundant-guard": ["pass.ts:8", "pass.ts:38", "fail.ts:4", "fail.ts:66"],
  "reinvents-builtin": [
    ...pipe(
      ["4", "8", "16", "20", "24", "28", "34", "38", "51", "56", "60", "64", "68"],
      Arr.map((line) => `pass.ts:${line}`),
    ),
    ...pipe(
      ["4", "14", "19", "23", "27", "39", "51", "55", "60", "66"],
      Arr.map((line) => `fail.ts:${line}`),
    ),
  ],
  "suppression-instead-of-fix": ["pass.ts:51", "fail.ts:60"],
};

const sorted = (
  byId: Readonly<Record<string, readonly string[]>>,
): Readonly<Record<string, readonly string[]>> =>
  Rec.fromEntries(
    pipe(
      Rec.toEntries(byId),
      Arr.map(([id, at]) => [id, Arr.sort(at, Order.String)]),
    ),
  );

const EXPECTED = sorted(ASKED);

const REPORTED = /^(?<at>[^:]+:\d+):\d+: \[(?<id>[^\]]+)\]/u;

const reportOf = (line: string): Option.Option<readonly [string, string]> =>
  Option.fromNullishOr(REPORTED.exec(line)).pipe(
    Option.flatMap((found) => Option.fromUndefinedOr(found.groups)),
    Option.map((groups) => [String(groups["id"]), String(groups["at"])] as const),
  );

const byRule = (stdout: string): Readonly<Record<string, readonly string[]>> => {
  const reports = Arr.getSomes(
    pipe(
      Str.split(stdout, "\n"),
      Arr.map((line) => reportOf(line)),
    ),
  );
  const grouped = Arr.groupBy(reports, ([id]) => Str.replace(`${AI_SLOP}/`, "")(id));
  return Rec.fromEntries(
    pipe(
      Rec.toEntries(grouped),
      Arr.map(([id, found]) => [
        id,
        pipe(
          found,
          Arr.map(([, at]) => at),
        ),
      ]),
    ),
  );
};

const exampleFile = (
  name: string,
): Effect.Effect<string, PlatformError, FileSystem.FileSystem | Services> =>
  Effect.gen(function* read() {
    const fs = yield* FileSystem.FileSystem;
    const file = yield* fromRoot("example", "ai-slop", name);
    return yield* fs.readFileString(file);
  });

const askedWhere = Effect.scoped(
  Effect.gen(function* test() {
    const core = yield* fromRoot(
      "node_modules",
      "@r_masseater",
      "oxlint-plugin-decision",
      "dist",
      "index.mjs",
    );
    const entry = yield* fromRoot("dist", "ai-slop.mjs");
    const cwd = yield* tempProject({
      "plugin.mjs": alwaysYes(core, entry),
      "fail.ts": yield* exampleFile("fail.ts"),
      "pass.ts": yield* exampleFile("pass.ts"),
      "oxlint.config.ts": configSource({
        jsPlugins: ["./plugin.mjs"],
        rules: enabled(AI_SLOP, aiSlopRules),
        settings: { [AI_SLOP]: { model: "fake/any" } },
      }),
    });
    const run = yield* oxlint(cwd, ["--format", "unix", "-c", "oxlint.config.ts", ...EXAMPLES], {});
    strictEqual(run.status, FAILED, outputOf(run));
    deepStrictEqual(sorted(byRule(run.stdout)), EXPECTED);
  }),
);

const loadsEntry = Effect.scoped(
  Effect.gen(function* test() {
    const plugin = yield* fromRoot("dist", "ai-slop.mjs");
    const cwd = yield* tempProject({
      "a.ts": "export function a(): void {}\n",
      "oxlint.config.ts": configSource({
        jsPlugins: [plugin],
        rules: enabled(AI_SLOP, aiSlopRules),
      }),
    });
    const run = yield* oxlint(cwd, ["-c", "oxlint.config.ts", "a.ts"], { CI: "1" });
    strictEqual(run.status, FAILED, outputOf(run));
    assertInclude(outputOf(run), "OPENROUTER_API_KEY is not set");
  }),
);

layer(NodeServices.layer, { excludeTestServices: true })("the ai-slop rules", (it) => {
  it.effect("ask only about the functions each rule's select picks", () => askedWhere, TIMEOUT);
  it.effect("dist/ai-slop.mjs loads as an oxlint plugin", () => loadsEntry, TIMEOUT);
});
