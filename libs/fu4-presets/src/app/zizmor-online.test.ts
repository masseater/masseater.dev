import { layer as nodeServices } from "@effect/platform-node/NodeServices";
import type { Diagnostic, Fu4Error } from "@r_masseater/fu4";
import { Array as Arr, Effect, FileSystem, ManagedRuntime, String as Str } from "effect";
import type { PlatformError } from "effect/PlatformError";
import { afterAll, expect, test } from "vite-plus/test";

import {
  ADVISORY,
  BRANCH_HEAD,
  COMPARE_MAIN,
  NEVER,
  ONCE,
  ORPHAN,
  OTHER_TAG,
  TAGGED,
  UPLOAD_PACK,
  checkoutRefs,
  count,
  json,
  linted,
  messageOf,
  refsBody,
  rules,
  serverOf,
} from "./zizmor-online.test.support.ts";
import type { Routes, Run, Server } from "./zizmor-online.test.support.ts";

const services = ManagedRuntime.make(nodeServices);
afterAll(() => services.dispose());

type Failure = Fu4Error | PlatformError;

const tempRoot = FileSystem.FileSystem.pipe(
  Effect.flatMap((fileSystem) => fileSystem.makeTempDirectory({ prefix: "fu4-online-" })),
);

const lintedFresh = (
  run: Run,
): Effect.Effect<readonly Diagnostic[], Failure, FileSystem.FileSystem> =>
  tempRoot.pipe(Effect.flatMap((root) => linted(root)(run)));

const inServices =
  (body: Effect.Effect<void, Failure, FileSystem.FileSystem>) => (): Promise<void> =>
    services.runPromise(body);

test(
  "flags a ref that names both a branch and a tag",
  inServices(
    Effect.gen(function* confused() {
      const server = serverOf(checkoutRefs([[BRANCH_HEAD, "refs/heads/v4"]]));
      const found = yield* lintedFresh({ uses: "actions/checkout@v4", server });
      expect(rules(found)).toContain("zizmor/ref-confusion");
    }),
  ),
);

test(
  "passes a ref that names only a tag",
  inServices(
    Effect.gen(function* tagOnly() {
      const server = serverOf(checkoutRefs([]));
      const found = yield* lintedFresh({ uses: "actions/checkout@v4", server });
      expect(rules(found)).not.toContain("zizmor/ref-confusion");
    }),
  ),
);

test(
  "flags a commit that no branch or tag contains",
  inServices(
    Effect.gen(function* impostor() {
      const server = serverOf({
        ...checkoutRefs([]),
        [`GET github.com/actions/checkout/branch_commits/${ORPHAN}`]: json({
          branches: [],
          tags: [],
        }),
      });
      const found = yield* lintedFresh({ uses: `actions/checkout@${ORPHAN}`, server });
      expect(rules(found)).toContain("zizmor/impostor-commit");
    }),
  ),
);

test(
  "passes a commit that a tag points to",
  inServices(
    Effect.gen(function* tagged() {
      const server = serverOf(checkoutRefs([]));
      const uses = `actions/checkout@${TAGGED} # v4.2.0`;
      const found = yield* lintedFresh({ uses, server, zizmor: { persona: "auditor" } });
      expect(rules(found)).not.toContain("zizmor/impostor-commit");
      expect(rules(found)).not.toContain("zizmor/stale-action-refs");
      expect(rules(found)).not.toContain("zizmor/ref-version-mismatch");
    }),
  ),
);

test(
  "flags a pinned commit that no tag points to",
  inServices(
    Effect.gen(function* stale() {
      const server = serverOf(checkoutRefs([]));
      const uses = `actions/checkout@${BRANCH_HEAD}`;
      const found = yield* lintedFresh({ uses, server, zizmor: { persona: "auditor" } });
      expect(rules(found)).toContain("zizmor/stale-action-refs");
      expect(rules(found)).not.toContain("zizmor/impostor-commit");
    }),
  ),
);

test(
  "flags a version comment that points elsewhere",
  inServices(
    Effect.gen(function* mismatched() {
      const server = serverOf(checkoutRefs([[OTHER_TAG, "refs/tags/v5.0.0"]]));
      const found = yield* lintedFresh({ uses: `actions/checkout@${TAGGED} # v5.0.0`, server });
      expect(messageOf("zizmor/ref-version-mismatch")(found)).toContain(
        "tag points to commit 444444444444",
      );
    }),
  ),
);

const advisoryRoutes = (): Routes => ({
  ...checkoutRefs([]),
  "GET api.github.com/advisories": json([{ ghsa_id: ADVISORY, severity: "medium" }]),
});

test(
  "flags an action version with a known advisory",
  inServices(
    Effect.gen(function* vulnerable() {
      const server = serverOf(advisoryRoutes());
      const found = yield* lintedFresh({ uses: "actions/checkout@v4", server });
      const message = messageOf("zizmor/known-vulnerable-actions")(found);
      expect(message).toContain(ADVISORY);
      expect(message).toContain(`https://github.com/advisories/${ADVISORY}`);
    }),
  ),
);

test(
  "skips an advisory the configuration allows",
  inServices(
    Effect.gen(function* allowed() {
      const server = serverOf(advisoryRoutes());
      const zizmor = { rules: { "known-vulnerable-actions": { config: { allow: [ADVISORY] } } } };
      const found = yield* lintedFresh({ uses: "actions/checkout@v4", server, zizmor });
      expect(rules(found)).not.toContain("zizmor/known-vulnerable-actions");
    }),
  ),
);

test(
  "keeps offline audits when GitHub is unreachable",
  inServices(
    Effect.gen(function* unreachable() {
      const found = yield* lintedFresh({ uses: "actions/checkout@v4", server: serverOf({}) });
      expect(rules(found)).toContain("zizmor/unpinned-uses");
    }),
  ),
);

const reachableByMain = (): Routes => ({
  ...checkoutRefs([]),
  "GET api.github.com/repos/actions/checkout": json({ default_branch: "main" }),
  [COMPARE_MAIN]: json({ status: "behind" }),
});

const compares = (server: Server): readonly string[] =>
  Arr.filter(server.calls(), Str.includes("/compare/"));

test(
  "compares against the default branch first and remembers reachable commits",
  inServices(
    Effect.gen(function* remembered() {
      const cold = serverOf(reachableByMain());
      const warm = serverOf(reachableByMain());
      const uses = `actions/checkout@${ORPHAN}`;
      const root = yield* tempRoot;
      const first = yield* linted(root)({ uses, server: cold });
      const second = yield* linted(root)({ uses, server: warm, token: "another-token" });
      expect(rules(first)).not.toContain("zizmor/impostor-commit");
      expect(compares(cold)).toStrictEqual([COMPARE_MAIN]);
      expect(rules(second)).not.toContain("zizmor/impostor-commit");
      expect(count(COMPARE_MAIN)(warm)).toBe(NEVER);
    }),
  ),
);

test(
  "lists the refs of a repository once per run",
  inServices(
    Effect.gen(function* listedOnce() {
      const server = serverOf(checkoutRefs([]));
      yield* lintedFresh({ uses: "actions/checkout@v4", server });
      expect(count(UPLOAD_PACK)(server)).toBe(ONCE);
    }),
  ),
);

test(
  "confirms that a typosquatted repository exists",
  inServices(
    Effect.gen(function* typosquat() {
      const server = serverOf({
        "POST github.com/actoins/checkout.git/git-upload-pack": refsBody([
          [TAGGED, "refs/tags/v4"],
        ]),
      });
      const found = yield* lintedFresh({ uses: "actoins/checkout@v4", server });
      expect(messageOf("zizmor/typosquat-uses")(found)).toContain("resolves to a live repository");
    }),
  ),
);
