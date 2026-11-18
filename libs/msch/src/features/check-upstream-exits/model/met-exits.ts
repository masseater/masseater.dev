import {
  Array as Arr,
  Config,
  Effect,
  HashMap,
  Match,
  Option,
  Record as Rec,
  Schema,
  String as Str,
  pipe,
} from "effect";
import { HttpClient, HttpClientRequest, HttpClientResponse } from "effect/http";
import type { HttpClientError } from "effect/http";
import semver from "semver";

import { commentsByLine } from "./deviation-entries.ts";
import type { DeviationEntry, Deviations, Section } from "./deviation-entries.ts";
import { describeCondition, exitTextOf, parseCondition } from "./exit-condition.ts";
import type { Closed, Declares, ExitCondition, Published } from "./exit-condition.ts";

const NPM = "https://registry.npmjs.org/";
const CRATES = "https://crates.io/api/v1/crates/";
const GITHUB = "https://api.github.com/repos/";
const USER_AGENT = "msch-exits (https://github.com/masseater/masseater.dev/tree/main/libs/msch)";
const LOOKUP_CONCURRENCY = 4;
const RANGE_OPTIONS = { includePrerelease: true } as const;

const DECLARING_SECTIONS = ["optionalDependencies", "peerDependencies", "dependencies"] as const;
const Dependencies = Schema.Record(Schema.String, Schema.String);
const NpmVersion = Schema.Record(Schema.String, Schema.Unknown);
const decodeDependencies = Schema.decodeUnknownOption(Dependencies);
const NpmPackument = Schema.Struct({
  "dist-tags": Schema.Struct({ latest: Schema.String }),
  versions: Schema.Record(Schema.String, NpmVersion),
});
const Crate = Schema.Struct({
  crate: Schema.Struct({
    max_stable_version: Schema.NullOr(Schema.String),
    newest_version: Schema.String,
  }),
  versions: Schema.Array(Schema.Struct({ num: Schema.String, yanked: Schema.Boolean })),
});
const CrateDependencies = Schema.Struct({
  dependencies: Schema.Array(Schema.Struct({ crate_id: Schema.String, req: Schema.String })),
});
const Issue = Schema.Struct({ state: Schema.String });

type NpmVersionType = typeof NpmVersion.Type;
type LookupError = HttpClientError.HttpClientError | Schema.SchemaError;

/** @internal */
export interface Release {
  readonly versions: readonly string[];
  readonly latestDependencies: Readonly<Record<string, string>>;
}

/** @internal */
export interface ExitEntry {
  readonly line: number;
  readonly section: Section;
  readonly key: string;
  readonly conditions: readonly ExitCondition[];
}

/** @internal */
export interface MetExit {
  readonly entry: ExitEntry;
  readonly condition: string;
  readonly outcome: "met" | "unchecked";
}

interface Lookup {
  readonly url: string;
  readonly token: Option.Option<string>;
}

const requestOf = ({ url, token }: Lookup): HttpClientRequest.HttpClientRequest => {
  const request = HttpClientRequest.get(url).pipe(
    HttpClientRequest.setHeader("user-agent", USER_AGENT),
    HttpClientRequest.acceptJson,
  );
  return Option.match(token, {
    onNone: () => request,
    onSome: (value) => HttpClientRequest.bearerToken(value)(request),
  });
};

const fetched = (
  lookup: Lookup,
): Effect.Effect<
  HttpClientResponse.HttpClientResponse,
  HttpClientError.HttpClientError,
  HttpClient.HttpClient
> =>
  HttpClient.HttpClient.pipe(
    Effect.flatMap((client) => HttpClient.filterStatusOk(client).execute(requestOf(lookup))),
  );

const publicLookup = (url: string): Lookup => ({ url, token: Option.none() });

const declaredBy = (version: NpmVersionType): Readonly<Record<string, string>> =>
  pipe(
    DECLARING_SECTIONS,
    Arr.flatMap((section) =>
      pipe(
        decodeDependencies(version[section]),
        Option.map(Rec.toEntries),
        Option.getOrElse((): readonly (readonly [string, string])[] => []),
      ),
    ),
    Rec.fromEntries,
  );

const npmRelease = (name: string): Effect.Effect<Release, LookupError, HttpClient.HttpClient> =>
  fetched(publicLookup(`${NPM}${Str.replace("/", "%2f")(name)}`)).pipe(
    Effect.flatMap(HttpClientResponse.schemaBodyJson(NpmPackument)),
    Effect.map(({ "dist-tags": tags, versions }) => ({
      versions: Rec.keys(versions),
      latestDependencies: pipe(
        Rec.get(versions, tags.latest),
        Option.map(declaredBy),
        Option.getOrElse(() => ({})),
      ),
    })),
  );

const crateRelease = Effect.fn("crateRelease")(function* lookupCrate(name: string) {
  const found = yield* fetched(publicLookup(`${CRATES}${name}`)).pipe(
    Effect.flatMap(HttpClientResponse.schemaBodyJson(Crate)),
  );
  const latest = found.crate.max_stable_version ?? found.crate.newest_version;
  const { dependencies } = yield* fetched(
    publicLookup(`${CRATES}${name}/${latest}/dependencies`),
  ).pipe(Effect.flatMap(HttpClientResponse.schemaBodyJson(CrateDependencies)));
  const release: Release = {
    versions: pipe(
      found.versions,
      Arr.filter(({ yanked }) => !yanked),
      Arr.map(({ num }) => num),
    ),
    latestDependencies: Rec.fromEntries(
      pipe(
        dependencies,
        Arr.map(({ crate_id: crateId, req }) => [crateId, req] as const),
      ),
    ),
  };
  return release;
});

const releaseOf = (
  condition: Published | Declares,
): Effect.Effect<Release, LookupError, HttpClient.HttpClient> => {
  if (condition.registry === "npm") {
    return npmRelease(condition.name);
  }
  return crateRelease(condition.name);
};

const declaresMet =
  (release: Release) =>
  (condition: Declares): boolean => {
    const declared = Rec.get(release.latestDependencies, condition.dependency);
    if (condition.relation === "drops") {
      return Option.isNone(declared);
    }
    return Option.exists(declared, (range) => {
      if (semver.validRange(range) === null) {
        return false;
      }
      if (condition.relation === "allows") {
        return semver.intersects(range, condition.range, RANGE_OPTIONS);
      }
      return semver.subset(range, condition.range, RANGE_OPTIONS);
    });
  };

/** @internal */
export const isMet =
  (release: Release) =>
  (condition: ExitCondition): boolean =>
    Match.value(condition).pipe(
      Match.discriminatorsExhaustive("kind")({
        unused: () => false,
        closed: () => false,
        published: ({ range }) =>
          pipe(
            release.versions,
            Arr.some((version) => semver.satisfies(version, range)),
          ),
        declares: declaresMet(release),
      }),
    );

const issueClosed = Effect.fn("issueClosed")(function* lookupIssue(condition: Closed) {
  const token = yield* Config.option(
    Config.String("GH_TOKEN").pipe(Config.orElse(() => Config.String("GITHUB_TOKEN"))),
  ).pipe(Effect.orElseSucceed(() => Option.none<string>()));
  const issue = yield* fetched({
    url: `${GITHUB}${condition.owner}/${condition.repo}/issues/${String(condition.number)}`,
    token,
  }).pipe(Effect.flatMap(HttpClientResponse.schemaBodyJson(Issue)));
  return issue.state === "closed";
});

const conditionMet = (
  condition: ExitCondition,
): Effect.Effect<boolean, LookupError, HttpClient.HttpClient> =>
  Match.value(condition).pipe(
    Match.discriminatorsExhaustive("kind")({
      unused: () => Effect.succeed(false),
      closed: issueClosed,
      published: (published) =>
        Effect.map(releaseOf(published), (release) => isMet(release)(published)),
      declares: (declares) =>
        Effect.map(releaseOf(declares), (release) => isMet(release)(declares)),
    }),
  );

/** @internal */
export const exitEntries = (deviations: Deviations): readonly ExitEntry[] => {
  const comments = commentsByLine(deviations.comments);
  const entryOf = ({ line, section, key }: DeviationEntry): readonly ExitEntry[] =>
    pipe(
      HashMap.get(comments, line),
      Option.flatMap(({ text }) => exitTextOf(text)),
      Option.flatMap(parseCondition),
      Option.map((conditions): ExitEntry => ({ line, section, key, conditions })),
      Option.toArray,
    );
  return pipe(deviations.entries, Arr.flatMap(entryOf));
};

const metOf = (
  entry: ExitEntry,
  condition: ExitCondition,
): Effect.Effect<Option.Option<MetExit>, never, HttpClient.HttpClient> => {
  const described = describeCondition(condition);
  return conditionMet(condition).pipe(
    Effect.match({
      onSuccess: (met) =>
        Option.liftPredicate({ entry, condition: described, outcome: "met" } as const, () => met),
      onFailure: (error) =>
        Option.some({
          entry,
          condition: `${described} (${String(error)})`,
          outcome: "unchecked",
        } as const),
    }),
  );
};

/** @internal */
export const metExits = Effect.fn("metExits")(function* metExits(entries: readonly ExitEntry[]) {
  const checksOf = (entry: ExitEntry): readonly ReturnType<typeof metOf>[] =>
    pipe(
      entry.conditions,
      Arr.map((condition) => metOf(entry, condition)),
    );
  const checks = pipe(entries, Arr.flatMap(checksOf));
  const results = yield* Effect.all(checks, { concurrency: LOOKUP_CONCURRENCY });
  return Arr.getSomes(results);
});
