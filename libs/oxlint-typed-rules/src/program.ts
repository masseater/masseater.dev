import { Cause, Effect, Exit, Layer, ManagedRuntime, Option, String as Str } from "effect";
import { FetchHttpClient } from "effect/http";
import { OtlpSerialization, OtlpTracer } from "effect/observability";
import { createFileSystemLayer } from "typescript/fs";
import { API } from "typescript/sync";
import type { Project, Snapshot } from "typescript/sync";

import { internProgram } from "./compat.ts";
import type { CompatProgram } from "./compat.ts";
import { memoizeByKey } from "./memo.ts";

const tracing = OtlpTracer.layerFromConfig({
  resource: { serviceName: "oxlint-typed-rules" },
}).pipe(Layer.provide(OtlpSerialization.layerJson), Layer.provide(FetchHttpClient.layer));

const runtime = ManagedRuntime.make(tracing);

interface Overlay {
  readonly fileName: string;
  readonly text: string;
}

const startApi = (): API => {
  const started = new API();
  process.once("beforeExit", () => {
    started.close();
    Effect.runFork(runtime.disposeEffect);
  });
  return started;
};

const api = startApi();

const snapshots = new Map<API, Snapshot>([[api, api.createSnapshot()]]);

const currentSnapshot = (): Snapshot =>
  Option.fromNullishOr(snapshots.get(api)).pipe(
    Option.getOrElse(() => {
      const created = api.createSnapshot();
      snapshots.set(api, created);
      return created;
    }),
  );

const matchesText = (project: Project, overlay: Overlay): boolean =>
  Option.fromNullishOr(project.program.getSourceFile(overlay.fileName)).pipe(
    Option.exists((sourceFile) => sourceFile.text === overlay.text),
  );

const directoryOf = (fileName: string): string => Str.replace(/[\\/][^\\/]*$/u, "")(fileName);

const directoryProjects = memoizeByKey(
  (_snapshot: Snapshot): Map<string, Project> => new Map<string, Project>(),
);

const defaultProject = (snapshot: Snapshot, fileName: string): Option.Option<Project> =>
  Option.fromNullishOr(snapshot.getDefaultProjectForFile(fileName)).pipe(
    Option.map((project) => {
      directoryProjects(snapshot).set(directoryOf(fileName), project);
      return project;
    }),
  );

const currentProject = (overlay: Overlay): Option.Option<Project> => {
  const snapshot = currentSnapshot();
  return Option.fromNullishOr(directoryProjects(snapshot).get(directoryOf(overlay.fileName))).pipe(
    Option.filter((project) => matchesText(project, overlay)),
    Option.orElse(() =>
      defaultProject(snapshot, overlay.fileName).pipe(
        Option.filter((project) => matchesText(project, overlay)),
      ),
    ),
  );
};

const openFile = (overlay: Overlay): Effect.Effect<Option.Option<Project>> =>
  Effect.sync(() => {
    const updated = currentSnapshot().update({
      openFiles: [overlay.fileName],
      fileSystem: createFileSystemLayer([[overlay.fileName, overlay.text]]),
    });
    snapshots.set(api, updated);
    return defaultProject(updated, overlay.fileName);
  }).pipe(
    Effect.withSpan("oxlint-typed-rules.open-file", {
      attributes: { fileName: overlay.fileName },
    }),
  );

const projectOfFile = (overlay: Overlay): Effect.Effect<Option.Option<Project>> =>
  Effect.suspend(() =>
    Option.match(currentProject(overlay), {
      onSome: Effect.succeedSome,
      onNone: () => openFile(overlay),
    }),
  );

const programFor = (overlay: Overlay): Option.Option<CompatProgram> =>
  Exit.match(runtime.runSyncExit(projectOfFile(overlay)), {
    onSuccess: Option.map(internProgram),
    onFailure: (cause) => {
      throw Cause.squash(cause);
    },
  });

export type { Overlay };
export { programFor };
