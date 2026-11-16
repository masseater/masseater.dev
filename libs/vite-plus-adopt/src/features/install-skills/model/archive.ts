import {
  Array as Arr,
  Config,
  Effect,
  Exit,
  Option,
  Record as Rec,
  Redacted,
  Schema,
  String as Str,
  pipe,
} from "effect";
import { HttpClient, HttpClientRequest } from "effect/http";
import type { HttpClientError } from "effect/http";
import { parse } from "yaml";

import type { SkillSource } from "#/shared/config/index.ts";
import { checksFailed, toolFailed } from "#/shared/lib/errors.ts";
import type { VpToolsError } from "#/shared/lib/errors.ts";
import { readTarGz } from "#/shared/lib/tar-gz.ts";
import type { TarEntry } from "#/shared/lib/tar-gz.ts";

/** @internal */
export interface Declared {
  readonly repository: string;
  readonly source: SkillSource;
}

/** @internal */
export interface FoundSkill {
  readonly name: string;
  readonly directory: string;
}

/** @internal */
export const SEPARATOR = "/";

const SKILL_FILE = "SKILL.md";
const FRONTMATTER = /^---\r?\n(?<yaml>[\s\S]*?)\r?\n---/u;
const NEXT = 1;
const START = 0;
const SINGLE = 1;
const SHORT_COMMIT = 7;

const Frontmatter = Schema.Struct({ name: Schema.String });
const decodeFrontmatter = Schema.decodeUnknownOption(Frontmatter);
const parseYaml = Option.liftThrowable((yaml: string): unknown => parse(yaml));

const nameOf = (markdown: string): Option.Option<string> =>
  pipe(
    Option.fromNullishOr(FRONTMATTER.exec(markdown)),
    Option.flatMap((found) => Option.fromNullishOr(found.groups)),
    Option.flatMap((groups) => Rec.get(groups, "yaml")),
    Option.flatMap(parseYaml),
    Option.flatMap(decodeFrontmatter),
    Option.map(({ name }) => name),
  );

const afterFirstSegment = (path: string): string =>
  pipe(
    path,
    Str.indexOf(SEPARATOR),
    Option.match({ onNone: () => path, onSome: (at) => Str.slice(at + NEXT)(path) }),
  );

const withoutTopDirectory = ({ header, bytes }: TarEntry): TarEntry => ({
  header: { ...header, path: afterFirstSegment(header.path) },
  bytes,
});

/** @internal */
export const isUnder =
  (directory: string) =>
  (path: string): boolean =>
    directory === "" || Str.startsWith(`${directory}${SEPARATOR}`)(path);

/** @internal */
export const relativeTo =
  (directory: string) =>
  (path: string): string => {
    if (directory === "") {
      return path;
    }
    return Str.slice(directory.length + NEXT)(path);
  };

const parentOf = (path: string): string =>
  pipe(
    path,
    Str.lastIndexOf(SEPARATOR),
    Option.match({ onNone: () => "", onSome: (at) => Str.slice(START, at)(path) }),
  );

const isSkillFile =
  (root: string) =>
  (entry: TarEntry): boolean =>
    entry.header.type === "File" &&
    (entry.header.path === SKILL_FILE ||
      Str.endsWith(`${SEPARATOR}${SKILL_FILE}`)(entry.header.path)) &&
    isUnder(root)(entry.header.path);

interface Candidate {
  readonly directory: string;
  readonly name: Option.Option<string>;
}

const isOutermost =
  (candidates: readonly Candidate[]) =>
  ({ directory }: Candidate): boolean =>
    !pipe(
      candidates,
      Arr.some((other) => other.directory !== directory && isUnder(other.directory)(directory)),
    );

const toFound = ({ directory, name }: Candidate): readonly FoundSkill[] =>
  pipe(
    name,
    Option.map((found): FoundSkill => ({ name: found, directory })),
    Option.toArray,
  );

const duplicatesOf = (found: readonly FoundSkill[]): readonly string[] =>
  pipe(
    found,
    Arr.groupBy(({ name }) => name),
    Rec.filter((group) => group.length > SINGLE),
    Rec.keys,
  );

/** @internal */
export const skillsIn =
  ({ repository, source }: Declared) =>
  (entries: readonly TarEntry[]): Effect.Effect<readonly FoundSkill[], VpToolsError> => {
    const decoder = new TextDecoder();
    const root = source.root ?? "";
    const candidates = pipe(
      entries,
      Arr.filter(isSkillFile(root)),
      Arr.map(({ header, bytes }): Candidate => ({
        directory: parentOf(header.path),
        name: nameOf(decoder.decode(bytes)),
      })),
    );
    const found = pipe(candidates, Arr.filter(isOutermost(candidates)), Arr.flatMap(toFound));
    const duplicated = duplicatesOf(found);
    if (Arr.isReadonlyArrayNonEmpty(duplicated)) {
      return Effect.fail(
        checksFailed(
          `${repository} declares ${Arr.join(duplicated, ", ")} in more than one folder`,
        ),
      );
    }
    return Effect.succeed(found);
  };

/** @internal */
export const selectSkills =
  ({ repository, source }: Declared) =>
  (available: readonly string[]): Effect.Effect<readonly string[], VpToolsError> => {
    if (source.skills === "all") {
      return Effect.succeed(available);
    }
    const missing = pipe(
      source.skills,
      Arr.filter((name) => !Arr.contains(available, name)),
    );
    if (Arr.isReadonlyArrayNonEmpty(missing)) {
      const commit = Str.slice(START, SHORT_COMMIT)(source.commit);
      return Effect.fail(
        checksFailed(
          `${repository}@${commit} has no skill named ${Arr.join(missing, ", ")}. It has: ${Arr.join(available, ", ")}`,
        ),
      );
    }
    return Effect.succeed(source.skills);
  };

const codeload = ({ repository, source }: Declared): HttpClientRequest.HttpClientRequest =>
  HttpClientRequest.get(`https://codeload.github.com/${repository}/tar.gz/${source.commit}`);

const api =
  ({ repository, source }: Declared) =>
  (token: Redacted.Redacted): HttpClientRequest.HttpClientRequest =>
    HttpClientRequest.get(
      `https://api.github.com/repos/${repository}/tarball/${source.commit}`,
    ).pipe(HttpClientRequest.bearerToken(Redacted.value(token)));

const fetchBytes = (
  request: HttpClientRequest.HttpClientRequest,
): Effect.Effect<Uint8Array, HttpClientError.HttpClientError, HttpClient.HttpClient> =>
  Effect.gen(function* fetchArchive() {
    const httpClient = yield* HttpClient.HttpClient;
    const response = yield* HttpClient.filterStatusOk(httpClient).execute(request);
    const body = yield* response.arrayBuffer;
    return new Uint8Array(body);
  });

const githubToken: Effect.Effect<Option.Option<Redacted.Redacted>> = Config.option(
  Config.Redacted("GITHUB_TOKEN"),
).pipe(Effect.orElseSucceed(Option.none));

const download = (
  declared: Declared,
): Effect.Effect<Uint8Array, VpToolsError, HttpClient.HttpClient> =>
  Effect.gen(function* downloadArchive() {
    const fromCodeload = yield* Effect.exit(fetchBytes(codeload(declared)));
    const token = yield* githubToken;
    if (Exit.isSuccess(fromCodeload) || Option.isNone(token)) {
      return yield* fromCodeload;
    }
    return yield* token.value.pipe(api(declared), fetchBytes);
  }).pipe(Effect.mapError(toolFailed(`downloading ${declared.repository}`)));

/** @internal */
export const downloadEntries = (
  declared: Declared,
): Effect.Effect<readonly TarEntry[], VpToolsError, HttpClient.HttpClient> =>
  download(declared).pipe(Effect.flatMap(readTarGz), Effect.map(Arr.map(withoutTopDirectory)));
