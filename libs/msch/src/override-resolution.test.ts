import { String as Str } from "effect";
import { expect, it } from "vite-plus/test";

import {
  advisoriesIn,
  judge,
  overrideKeysOf,
  peerIssuesIn,
  resolutionOf,
  withBaselineProbe,
  withoutOverride,
} from "./override-resolution.ts";

const MANIFEST = `packages:
  - apps/*
overrides:
  sharp@<0.35.5: ^0.35.5
  "steiger>@feature-sliced/steiger-plugin": "-"
catalog:
  zod: 4.6.7
`;

const lockfileWith = (sharp: string, snapshot: string): string => `lockfileVersion: '9.0'

packages:

  '@img/sharp-linux-x64@${sharp}':
    resolution: {integrity: sha512-a}

  zod@4.6.7:
    resolution: {integrity: sha512-b}

snapshots:

  '@img/sharp-linux-x64@${sharp}': {}

  ${snapshot}: {}
`;

const peerLog = (parents: string): string =>
  `{"name":"pnpm:peer-dependency-issues","issuesByProjects":{"apps/web":{"bad":{"typescript":[{"parents":[${parents}],"wantedRange":"^5","foundVersion":"7.1.0"}]},"missing":{},"conflicts":[]}}}`;

const ELYSIA = '{"name":"elysia","version":"1.0.0"}';
const EDEN = '{"name":"eden","version":"1.0.0"}';
const AUDIT =
  '{"advisories":{"1":{"module_name":"sharp","github_advisory_id":"GHSA-rgj7-g3m4-5g8c"}}}';

const NO_FINDINGS = { peerIssues: [], advisories: [] };

it("reads the override keys and edits only the named one", () => {
  expect(overrideKeysOf(MANIFEST)).toStrictEqual([
    "sharp@<0.35.5",
    "steiger>@feature-sliced/steiger-plugin",
  ]);
  expect(withoutOverride("sharp@<0.35.5")(MANIFEST)).toBe(
    Str.replace("  sharp@<0.35.5: ^0.35.5\n", "")(MANIFEST),
  );
  expect(overrideKeysOf(withBaselineProbe(MANIFEST))).toContain("msch-baseline-probe");
});

it("calls an override unused when nothing resolves differently without it", () => {
  const lockfile = lockfileWith("0.35.5", "zod@4.6.7");
  const baseline = resolutionOf(NO_FINDINGS)(lockfile);
  const report = judge(baseline)("zod@<4.6.6", resolutionOf(NO_FINDINGS)(lockfile));
  expect(report.verdict).toBe("unused");
});

it("keeps an override whose removal brings back an advisory", () => {
  const baseline = resolutionOf(NO_FINDINGS)(lockfileWith("0.35.5", "zod@4.6.7"));
  const candidate = resolutionOf({ peerIssues: [], advisories: advisoriesIn(AUDIT) })(
    lockfileWith("0.35.2", "zod@4.6.7"),
  );
  const report = judge(baseline)("sharp@<0.35.5", candidate);
  expect(report).toStrictEqual({
    key: "sharp@<0.35.5",
    verdict: "keep",
    changes: [{ name: "@img/sharp-linux-x64", before: ["0.35.5"], after: ["0.35.2"] }],
    peerContextsChanged: true,
    peerIssues: [],
    advisories: ["sharp GHSA-rgj7-g3m4-5g8c"],
  });
});

it("leaves a change in peer contexts alone to verify", () => {
  const baseline = resolutionOf(NO_FINDINGS)(lockfileWith("0.35.5", "zod@4.6.7"));
  const candidate = resolutionOf(NO_FINDINGS)(
    lockfileWith("0.35.5", "zod@4.6.7(typescript@7.1.0)"),
  );
  const report = judge(baseline)("vite@*", candidate);
  expect([report.verdict, report.changes, report.peerContextsChanged]).toStrictEqual([
    "verify",
    [],
    true,
  ]);
});

it("names a peer issue by the package that asks for the peer, not the path to it", () => {
  const viaApp = peerIssuesIn(`${peerLog(`${EDEN},${ELYSIA}`)}\nnot json\n`);
  const direct = peerIssuesIn(peerLog(ELYSIA));
  expect(viaApp).toStrictEqual(direct);
  expect(direct).toStrictEqual(["apps/web: unmet peer typescript@^5 of elysia@1.0.0, found 7.1.0"]);
});

it("finds nothing in output that is not an audit report", () => {
  expect(advisoriesIn("Done in 1s")).toStrictEqual([]);
});
