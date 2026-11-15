import type { ConversationKind } from "@masseater.dev/watashi-protocol";
import { Array as Arr, Effect, pipe } from "effect";
import type { FileSystem, PlatformError, Scope } from "effect";
import type { ChildProcessSpawner } from "effect/process";

import type { Settings } from "#/shared/config/index.ts";
import type { WatashiFailed } from "#/shared/lib/errors.ts";
import type { Services } from "#/shared/lib/services.ts";

import { betterleaksDetector, resolveBetterleaks } from "./betterleaks.ts";
import type { Detector } from "./betterleaks.ts";
import { pushFile } from "./push.ts";
import type { PushError, PushResult } from "./push.ts";
import { transcriptFiles } from "./transcript.ts";

/** @internal */
export type PushRequest = Readonly<{
  kind: ConversationKind;
  session: string;
  transcript: string;
  cwd: string;
}>;

const NONE = 0;

/** @internal */
export const detectorOf = (
  current: Settings,
): Effect.Effect<
  Detector,
  PlatformError.PlatformError | WatashiFailed,
  ChildProcessSpawner.ChildProcessSpawner | FileSystem.FileSystem | Scope.Scope
> => resolveBetterleaks(current.betterleaks).pipe(Effect.flatMap(betterleaksDetector));

/** @internal */
export const pushSession =
  (current: Settings) =>
  (request: PushRequest): Effect.Effect<readonly PushResult[], PushError, Services> =>
    Effect.gen(function* push() {
      const detect: Detector = yield* detectorOf(current);
      const files = yield* transcriptFiles({ file: request.session, path: request.transcript });
      const target = {
        kind: request.kind,
        session: request.session,
        cwd: request.cwd,
        source: current.source,
        remoteSession: current.remoteSession,
      };
      return yield* pipe(
        files,
        Effect.forEach((file) =>
          pushFile({
            target: { ...target, file: file.file, path: file.path },
            detect,
            home: current.home,
          }),
        ),
      );
    }).pipe(Effect.scoped);

/** @internal */
export const summaryOf = (results: readonly PushResult[]): string => {
  const total = Arr.reduce(
    results,
    { chunks: NONE, bytes: NONE, redactions: NONE },
    (sum, result) => ({
      chunks: sum.chunks + result.chunks,
      bytes: sum.bytes + result.bytes,
      redactions: sum.redactions + result.redactions,
    }),
  );
  return `${String(results.length)} files, ${String(total.chunks)} chunks, ${String(total.bytes)} bytes, ${String(total.redactions)} redactions`;
};
