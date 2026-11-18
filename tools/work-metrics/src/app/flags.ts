import { Flag } from "effect/cli";

const DEFAULT_DAYS = 14;

/** @internal */
export const daysFlag = Flag.Int("days").pipe(Flag.withDefault(DEFAULT_DAYS));

/** @internal */
export const outFlag = Flag.String("out");
