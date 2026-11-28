import { listWorkflowRunArtifacts, listWorkflowRuns } from "@distilled.cloud/github/actions";
import {
  Array as Arr,
  DateTime,
  Effect,
  FileSystem,
  Path,
  Stream,
  String as Str,
  pipe,
} from "effect";
import { HttpClient, HttpClientRequest } from "effect/http";
import { unzip } from "fflate";

import { PAGE_SIZE, githubToken } from "#/shared/api/index.ts";
import type { Repository } from "#/shared/api/index.ts";

const ARTIFACT_PREFIX = "telemetry-run-";
const FILE_NAME = "ci.jsonl";
const API = "https://api.github.com";

const startOf = (since: number): string => DateTime.formatIso(DateTime.makeUnsafe(since));

const runsSince = Effect.fn("timeSpans.runs")(function* runsSince(
  repository: Repository,
  workflow: string,
  since: number,
) {
  return yield* listWorkflowRuns
    .items({
      ...repository,
      workflow_id: workflow,
      created: `>=${startOf(since)}`,
      per_page: PAGE_SIZE,
    })
    .pipe(Stream.runCollect);
});

const artifactsOf = Effect.fn("timeSpans.artifacts")(function* artifactsOf(
  repository: Repository,
  runId: number,
) {
  const listed = yield* listWorkflowRunArtifacts
    .items({ ...repository, run_id: runId, per_page: PAGE_SIZE })
    .pipe(Stream.runCollect);
  return pipe(
    listed,
    Arr.filter((artifact) => Str.startsWith(ARTIFACT_PREFIX)(artifact.name) && !artifact.expired),
  );
});

const zipOf = Effect.fn("timeSpans.zip")(function* zipOf(repository: Repository, id: number) {
  const bearer = yield* githubToken;
  const client = (yield* HttpClient.HttpClient).pipe(HttpClient.filterStatusOk);
  const request = HttpClientRequest.get(
    `${API}/repos/${repository.owner}/${repository.repo}/actions/artifacts/${String(id)}/zip`,
  ).pipe(HttpClientRequest.bearerToken(bearer));
  const response = yield* client.execute(request);
  const buffer = yield* response.arrayBuffer;
  return new Uint8Array(buffer);
});

const unzipped = (bytes: Uint8Array): Effect.Effect<Readonly<Record<string, Uint8Array>>, Error> =>
  Effect.callback<Readonly<Record<string, Uint8Array>>, Error>((resume) => {
    unzip(bytes, (failure, files) => {
      if (failure === null) {
        resume(Effect.succeed(files));
      } else {
        resume(Effect.fail(failure));
      }
    });
  });

const saveArtifact = Effect.fn("timeSpans.save")(function* saveArtifact(
  input: Readonly<{ repository: Repository; into: string; runId: number; artifactId: number }>,
) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const bytes = yield* zipOf(input.repository, input.artifactId);
  const files = yield* unzipped(bytes);
  const directory = path.join(input.into, `${String(input.runId)}-${String(input.artifactId)}`);
  yield* fileSystem.makeDirectory(directory, { recursive: true });
  yield* fileSystem.writeFile(
    path.join(directory, FILE_NAME),
    files[FILE_NAME] ?? new Uint8Array(),
  );
  return directory;
});

const saveRun = Effect.fn("timeSpans.saveRun")(function* saveRun(
  input: Readonly<{ repository: Repository; into: string; runId: number }>,
) {
  const artifacts = yield* artifactsOf(input.repository, input.runId);
  return yield* Effect.forEach(
    artifacts,
    (artifact) => saveArtifact({ ...input, artifactId: artifact.id }),
    { concurrency: 1 },
  );
});

/** @internal */
export const downloadCiTraces = Effect.fn("timeSpans.download")(function* downloadCiTraces(
  input: Readonly<{ repository: Repository; workflow: string; since: number; into: string }>,
) {
  const runs = yield* runsSince(input.repository, input.workflow, input.since);
  const directories = yield* Effect.forEach(
    runs,
    (run) => saveRun({ repository: input.repository, into: input.into, runId: run.id }),
    { concurrency: 4 },
  );
  return Arr.flatten(directories);
});
