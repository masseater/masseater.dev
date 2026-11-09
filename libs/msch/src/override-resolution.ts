import { Array as Arr, Option, Order, Record as Rec, Schema, String as Str, pipe } from "effect";
import { isMap, isScalar, parseAllDocuments, parseDocument } from "yaml";

const VerdictSchema = Schema.Literals(["unused", "keep", "verify"]);

const PackageChangeSchema = Schema.Struct({
  name: Schema.String,
  before: Schema.Array(Schema.String),
  after: Schema.Array(Schema.String),
});

const OverrideReportSchema = Schema.Struct({
  key: Schema.String,
  verdict: VerdictSchema,
  changes: Schema.Array(PackageChangeSchema),
  peerContextsChanged: Schema.Boolean,
  peerIssues: Schema.Array(Schema.String),
  advisories: Schema.Array(Schema.String),
});

const OverrideReportList = Schema.Array(OverrideReportSchema);

type OverrideReport = typeof OverrideReportSchema.Type;
type PackageChange = typeof PackageChangeSchema.Type;

const PeerParentSchema = Schema.Struct({ name: Schema.String, version: Schema.String });

const PeerIssueSchema = Schema.Struct({
  parents: Schema.Array(PeerParentSchema),
  wantedRange: Schema.String,
  foundVersion: Schema.optionalKey(Schema.String),
});

type PeerIssue = typeof PeerIssueSchema.Type;

const ProjectPeerIssuesSchema = Schema.Struct({
  bad: Schema.Record(Schema.String, Schema.Array(PeerIssueSchema)),
  missing: Schema.Record(Schema.String, Schema.Array(PeerIssueSchema)),
  conflicts: Schema.Array(Schema.String),
});

type ProjectPeerIssues = typeof ProjectPeerIssuesSchema.Type;

const PeerIssuesLog = Schema.fromJsonString(
  Schema.Struct({
    name: Schema.Literal("pnpm:peer-dependency-issues"),
    issuesByProjects: Schema.Record(Schema.String, ProjectPeerIssuesSchema),
  }),
);

interface Findings {
  readonly peerIssues: readonly string[];
  readonly advisories: readonly string[];
}

interface Resolution extends Findings {
  readonly versions: Readonly<Record<string, readonly string[]>>;
  readonly snapshots: readonly string[];
}

const AdvisorySchema = Schema.Struct({
  module_name: Schema.String,
  github_advisory_id: Schema.String,
});

const AuditReport = Schema.fromJsonString(
  Schema.Struct({ advisories: Schema.Record(Schema.String, AdvisorySchema) }),
);

const SCOPE_PREFIX = "@";
const NAME_START = 0;
const SEPARATOR_LENGTH = 1;
const PEER_CONTEXT_START = "(";

const sorted = (values: readonly string[]): readonly string[] =>
  Arr.sort(Arr.dedupe(values), Order.String);

const describeIssue =
  (project: string, kind: string) =>
  ([peer, issues]: readonly [string, readonly PeerIssue[]]): readonly string[] =>
    pipe(
      issues,
      Arr.map((issue) => {
        const dependent = Option.match(Arr.last(issue.parents), {
          onNone: () => project,
          onSome: (parent) => `${parent.name}@${parent.version}`,
        });
        const found = Option.getOrElse(Option.fromUndefinedOr(issue.foundVersion), () => "none");
        return `${project}: ${kind} peer ${peer}@${issue.wantedRange} of ${dependent}, found ${found}`;
      }),
    );

const issuesOfProject = ([project, issues]: readonly [
  string,
  ProjectPeerIssues,
]): readonly string[] => [
  ...pipe(Rec.toEntries(issues.bad), Arr.flatMap(describeIssue(project, "unmet"))),
  ...pipe(Rec.toEntries(issues.missing), Arr.flatMap(describeIssue(project, "missing"))),
  ...pipe(
    issues.conflicts,
    Arr.map((peer) => `${project}: conflicting peer ${peer}`),
  ),
];

const peerIssuesIn = (output: string): readonly string[] =>
  sorted(
    pipe(
      Str.split(output, "\n"),
      Arr.map((line) => Schema.decodeOption(PeerIssuesLog)(line)),
      Arr.getSomes,
      Arr.flatMap((log) => pipe(Rec.toEntries(log.issuesByProjects), Arr.flatMap(issuesOfProject))),
    ),
  );

const advisoriesIn = (output: string): readonly string[] =>
  Option.match(Schema.decodeOption(AuditReport)(output), {
    onNone: () => [],
    onSome: (report) =>
      sorted(
        pipe(
          Rec.values(report.advisories),
          Arr.map((advisory) => `${advisory.module_name} ${advisory.github_advisory_id}`),
        ),
      ),
  });

const separatorOf = (key: string): Option.Option<number> => {
  if (!Str.startsWith(SCOPE_PREFIX)(key)) {
    return Str.indexOf(SCOPE_PREFIX)(key);
  }
  return pipe(
    Str.slice(SEPARATOR_LENGTH)(key),
    Str.indexOf(SCOPE_PREFIX),
    Option.map((index) => index + SEPARATOR_LENGTH),
  );
};

const withoutPeerContext = (version: string): string =>
  Option.match(Str.indexOf(PEER_CONTEXT_START)(version), {
    onNone: () => version,
    onSome: (start) => Str.slice(NAME_START, start)(version),
  });

const packageOf = (key: string): Option.Option<readonly [string, string]> =>
  Option.map(separatorOf(key), (separator) => [
    Str.slice(NAME_START, separator)(key),
    withoutPeerContext(Str.slice(separator + SEPARATOR_LENGTH)(key)),
  ]);

const keysOf = (node: unknown): readonly string[] => {
  if (!isMap(node)) {
    return [];
  }
  return pipe(
    node.items,
    Arr.flatMap((pair): readonly string[] => {
      if (isScalar(pair.key)) {
        return [String(pair.key.value)];
      }
      return [];
    }),
  );
};

const lockfileKeysOf = (lockfile: string, section: string): readonly string[] =>
  pipe(
    parseAllDocuments(lockfile),
    Arr.flatMap((document) => keysOf(document.get(section))),
  );

const resolutionOf =
  (findings: Findings) =>
  (lockfile: string): Resolution => {
    const snapshots = lockfileKeysOf(lockfile, "snapshots");
    const packages = Arr.getSomes(
      pipe(
        [...lockfileKeysOf(lockfile, "packages"), ...snapshots],
        Arr.map((key) => packageOf(key)),
      ),
    );
    const versions = Rec.map(
      Arr.groupBy(packages, ([name]) => name),
      (entries) =>
        sorted(
          pipe(
            entries,
            Arr.map(([, version]) => version),
          ),
        ),
    );
    return { ...findings, versions, snapshots: sorted(snapshots) };
  };

const changesBetween = (baseline: Resolution, candidate: Resolution): readonly PackageChange[] =>
  pipe(
    sorted([...Rec.keys(baseline.versions), ...Rec.keys(candidate.versions)]),
    Arr.map((name) => ({
      name,
      before: baseline.versions[name] ?? [],
      after: candidate.versions[name] ?? [],
    })),
    Arr.filter((change) => Arr.join(change.before, " ") !== Arr.join(change.after, " ")),
  );

const judge =
  (baseline: Resolution) =>
  (key: string, candidate: Resolution): OverrideReport => {
    const changes = changesBetween(baseline, candidate);
    const peerIssues = Arr.difference(candidate.peerIssues, baseline.peerIssues);
    const advisories = Arr.difference(candidate.advisories, baseline.advisories);
    const peerContextsChanged =
      Arr.join(baseline.snapshots, " ") !== Arr.join(candidate.snapshots, " ");
    const found = { key, changes, peerContextsChanged, peerIssues, advisories };
    if (!Arr.isReadonlyArrayNonEmpty(changes) && !peerContextsChanged) {
      return { ...found, verdict: "unused" };
    }
    if (Arr.isReadonlyArrayNonEmpty(peerIssues) || Arr.isReadonlyArrayNonEmpty(advisories)) {
      return { ...found, verdict: "keep" };
    }
    return { ...found, verdict: "verify" };
  };

const OVERRIDES = "overrides";
const BASELINE_PROBE = "msch-baseline-probe";
const REMOVED_DEPENDENCY = "-";

const overrideKeysOf = (manifest: string): readonly string[] =>
  keysOf(parseDocument(manifest).get(OVERRIDES));

const withoutOverride =
  (key: string) =>
  (manifest: string): string => {
    const document = parseDocument(manifest);
    document.deleteIn([OVERRIDES, key]);
    return document.toString();
  };

const withBaselineProbe = (manifest: string): string => {
  const document = parseDocument(manifest);
  document.setIn([OVERRIDES, BASELINE_PROBE], REMOVED_DEPENDENCY);
  return document.toString();
};

export {
  BASELINE_PROBE,
  OverrideReportList,
  advisoriesIn,
  judge,
  overrideKeysOf,
  peerIssuesIn,
  resolutionOf,
  withBaselineProbe,
  withoutOverride,
};
export type { Findings, OverrideReport, Resolution };
