import { layer as nodeServicesLayer } from "@effect/platform-node/NodeServices";
import { layer } from "@effect/vitest";
import { Array as Arr, Effect, String as Str } from "effect";
import { expect } from "vite-plus/test";

import type { Finding } from "#/shared/config/index.ts";
import { H56mError } from "#/shared/lib/errors.ts";

import { format, h56mSection, makeDetector } from "./index.ts";
import { TOKEN, commit, emptyRepository, git, write } from "./repository.test.support.ts";

const WATASHI = "wt_abcdefghij0123456789";
const WATASHI_RULE = {
  id: "watashi-token",
  regex: String.raw`\b(wt_[A-Za-z0-9]{20})\b`,
  keywords: ["wt_"],
};
const PRESET = { path: `${import.meta.dirname}/../../native/core/tests/fixtures/preset.toml` };
const COMMIT = "0123456789abcdef";
const SHORT_COMMIT = "0123456789ab";
const ASSIGNED = `const t = "${TOKEN}";\n`;
const BOTH = `${TOKEN}\n${WATASHI}\n`;
const TIMEOUT = 120_000;

const rulesOf = Arr.map(({ rule }: Finding) => rule);
const pathsOf = Arr.map(({ path }: Finding) => path);

const scanned = (text: string): Effect.Effect<readonly Finding[], H56mError> =>
  makeDetector({ extend: PRESET }).pipe(
    Effect.flatMap((detector) => detector.scanText({ path: "a.ts", text })),
  );

const onlyFinding = (text: string): Effect.Effect<Finding> =>
  scanned(text).pipe(Effect.map(Arr.head), Effect.flatMap(Effect.fromOption), Effect.orDie);

const usesUpstreamRules = Effect.gen(function* usesUpstreamRules() {
  const finding = yield* onlyFinding(ASSIGNED);
  expect(finding).toMatchObject({
    rule: "github-pat",
    path: "a.ts",
    line: 1,
    column: 12,
    endLine: 1,
    endColumn: 51,
    secret: TOKEN,
    confidence: "medium",
    encoded: false,
  });
  expect(finding).not.toHaveProperty("commit");
  expect(finding.digest).toMatch(/^[0-9a-f]{64}$/u);
});

const findsNothingInPlainText = Effect.gen(function* findsNothingInPlainText() {
  const found = yield* scanned("const answer = 42;\n");
  expect(found).toStrictEqual([]);
});

const addsConfiguredRules = Effect.gen(function* addsConfiguredRules() {
  const detector = yield* makeDetector({ extend: PRESET, rules: [WATASHI_RULE] });
  const found = yield* detector.scanText({ path: "chat.md", text: BOTH });
  expect(rulesOf(found)).toStrictEqual(["github-pat", "watashi-token"]);
});

const dropsUpstreamRules = Effect.gen(function* dropsUpstreamRules() {
  const detector = yield* makeDetector({ rules: [WATASHI_RULE] });
  const found = yield* detector.scanText({ path: "chat.md", text: BOTH });
  expect(rulesOf(found)).toStrictEqual(["watashi-token"]);
});

const skipsIgnoredDigests = Effect.gen(function* skipsIgnoredDigests() {
  const { digest } = yield* onlyFinding(ASSIGNED);
  const detector = yield* makeDetector({ extend: PRESET, ignoredSecrets: [digest] });
  const found = yield* detector.scanText({ path: "a.ts", text: ASSIGNED });
  expect(found).toStrictEqual([]);
});

const filtersByPath = Effect.gen(function* filtersByPath() {
  const detector = yield* makeDetector({
    extend: PRESET,
    filter: 'matchesAny(attributes["path"], [`^fixtures/`])',
  });
  const inFixtures = yield* detector.scanText({ path: "fixtures/a.ts", text: ASSIGNED });
  const inSource = yield* detector.scanText({ path: "src/a.ts", text: ASSIGNED });
  expect(pathsOf([...inFixtures, ...inSource])).toStrictEqual(["src/a.ts"]);
});

const rejectsInvalidRules = Effect.gen(function* rejectsInvalidRules() {
  const error = yield* Effect.flip(makeDetector({ rules: [{ id: "bad", regex: "(" }] }));
  expect(error).toBeInstanceOf(H56mError);
});

const formatsWithoutSecret = Effect.gen(function* formatsWithoutSecret() {
  const finding = yield* onlyFinding(`x\n${ASSIGNED}`);
  const line = format(finding);
  const withCommit = format({ ...finding, commit: COMMIT });
  expect(line).toMatch(/^a\.ts:2:12 github-pat .* sha256:[0-9a-f]{64}$/u);
  expect(line).not.toContain(TOKEN);
  expect(Str.endsWith(`(${SHORT_COMMIT})`)(withCommit)).toBe(true);
});

const scansStagedChanges = Effect.gen(function* scansStagedChanges() {
  const root = yield* emptyRepository;
  yield* write(root, { "staged.ts": ASSIGNED, "unstaged.ts": ASSIGNED });
  yield* git(root, ["add", "staged.ts"]);
  const detector = yield* makeDetector({ extend: PRESET });
  const found = yield* detector.scanGit({ root, source: { type: "staged" } });
  expect(pathsOf(found)).toStrictEqual(["staged.ts"]);
}).pipe(Effect.scoped);

const scansHistoryAndTrees = Effect.gen(function* scansHistoryAndTrees() {
  const root = yield* emptyRepository;
  const base = yield* commit(root, { "old.ts": ASSIGNED });
  const head = yield* commit(root, { "new.ts": ASSIGNED });
  const detector = yield* makeDetector({ extend: PRESET });
  const after = yield* detector.scanGit({
    root,
    source: { type: "history", bases: ["origin/main", base], head: "HEAD" },
  });
  const all = yield* detector.scanGit({ root, source: { type: "history", head: "HEAD" } });
  const tree = yield* detector.scanGit({ root, source: { type: "snapshot", revision: base } });
  expect(after).toMatchObject([{ path: "new.ts", commit: head }]);
  expect(pathsOf(all)).toStrictEqual(["new.ts", "old.ts"]);
  expect(pathsOf(tree)).toStrictEqual(["old.ts"]);
}).pipe(Effect.scoped);

const rejectsUnknownRevisions = Effect.gen(function* rejectsUnknownRevisions() {
  const root = yield* emptyRepository;
  yield* commit(root, { "a.ts": "export const a = 1;\n" });
  const detector = yield* makeDetector({ extend: PRESET });
  const error = yield* Effect.flip(
    detector.scanGit({ root, source: { type: "snapshot", revision: "no-such-branch" } }),
  );
  expect(error).toBeInstanceOf(H56mError);
}).pipe(Effect.scoped);

const readsSection = Effect.sync(() => {
  const config = { extend: PRESET };
  expect(h56mSection({ h56m: config })).toStrictEqual(config);
  expect(h56mSection({ other: true })).toStrictEqual({});
  expect(h56mSection({ h56m: "wrong" })).toStrictEqual({});
  expect(h56mSection("plain")).toStrictEqual({});
});

layer(nodeServicesLayer)("scanning text", (it) => {
  it.effect("uses the rules of the extended preset", () => usesUpstreamRules, TIMEOUT);
  it.effect("finds nothing in plain text", () => findsNothingInPlainText, TIMEOUT);
  it.effect("adds configured rules to the preset", () => addsConfiguredRules, TIMEOUT);
  it.effect("has no rules without a preset", () => dropsUpstreamRules, TIMEOUT);
  it.effect("skips ignored digests", () => skipsIgnoredDigests, TIMEOUT);
  it.effect("filters by path", () => filtersByPath, TIMEOUT);
  it.effect("rejects an invalid rule", () => rejectsInvalidRules, TIMEOUT);
  it.effect("formats a finding without its secret", () => formatsWithoutSecret, TIMEOUT);
  it.effect("reads the h56m section", () => readsSection);
});

layer(nodeServicesLayer)("scanning git", (it) => {
  it.effect("scans only staged changes", () => scansStagedChanges, TIMEOUT);
  it.effect("scans history after a base and a tree", () => scansHistoryAndTrees, TIMEOUT);
  it.effect("rejects an unknown revision", () => rejectsUnknownRevisions, TIMEOUT);
});
