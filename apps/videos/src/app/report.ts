import type { Issue, Timeline } from "@masseater.dev/video-kit/script";
import { Array as Arr, Console, Effect, Option, pipe } from "effect";

import type { Checked } from "#/features/check-video/index.ts";
import { videoError } from "#/shared/lib/video-error.ts";
import type { VideoError } from "#/shared/lib/video-error.ts";

const DIGITS = 1;
const MARK: Readonly<Record<Issue["severity"], string>> = { error: "✗", warning: "!" };
const WHOLE = "全体";

const summaryOf = ({ format, durationInFrames, fps, scenes }: Timeline): string =>
  `${format}: ${(durationInFrames / fps).toFixed(DIGITS)} 秒、${String(scenes.length)} シーン`;

const lineOf = ({ severity, scene, message }: Issue): string =>
  `${MARK[severity]} ${Option.getOrElse(scene, () => WHOLE)}: ${message}`;

/** @internal */
export const report = ({ issues, timelines }: Checked): Effect.Effect<void, VideoError> =>
  Effect.gen(function* print() {
    const lines = [...pipe(timelines, Arr.map(summaryOf)), ...pipe(issues, Arr.map(lineOf))];
    yield* Effect.forEach(lines, (line) => Console.log(line), { concurrency: 1, discard: true });
    const failed = pipe(
      issues,
      Arr.some(({ severity }) => severity === "error"),
    );
    if (failed) {
      return yield* videoError("台本の検査に通らなかった");
    }
    return yield* Effect.void;
  });
