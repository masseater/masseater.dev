import { Flag } from "effect/cli";

const DEFAULT_DAYS = 14;

/** @internal */
export const daysFlag = Flag.Int("days").pipe(Flag.withDefault(DEFAULT_DAYS));

/** @internal */
export const outFlag = Flag.String("out");

const MINIMUM_REPOSITORIES = 1;

/** @internal */
export const repoFlag = Flag.String("repo").pipe(Flag.atLeast(MINIMUM_REPOSITORIES));
