import { Flag } from "effect/cli";

const DEFAULT_DAYS = 14;

/** @internal */
export const daysFlag = Flag.Int("days").pipe(Flag.withDefault(DEFAULT_DAYS));

/** @internal */
export const outFlag = Flag.String("out");

const MINIMUM_REPOSITORIES = 1;

/** @internal */
export const repoFlag = Flag.String("repo").pipe(Flag.atLeast(MINIMUM_REPOSITORIES));

/** @internal */
export const dirFlag = Flag.String("dir");

const MINIMUM_DIRECTORIES = 1;

/** @internal */
export const dirsFlag = Flag.String("dir").pipe(Flag.atLeast(MINIMUM_DIRECTORIES));

const DEFAULT_TOP = 20;

/** @internal */
export const topFlag = Flag.Int("top").pipe(Flag.withDefault(DEFAULT_TOP));
