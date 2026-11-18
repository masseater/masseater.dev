import { useAtomValue } from "@effect/atom-react";
import type { Job } from "@masseater.dev/yogoto-protocol";
import { Array as Arr } from "effect";
import type { Option } from "effect";
import { AsyncResult } from "effect/reactivity";

import { fetchJobs } from "#/shared/api/index.ts";
import { runtime } from "#/shared/lib/index.ts";

/** @internal */
export const jobsAtom = runtime.atom(fetchJobs);

export const useJobs = (): readonly Job[] =>
  AsyncResult.getOrElse(useAtomValue(jobsAtom), Arr.empty);

export const latestJobOf =
  (songId: string) =>
  (jobs: readonly Job[]): Option.Option<Job> =>
    Arr.findFirst(jobs, (job) => job.songId === songId);
