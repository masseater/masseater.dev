import { Argument } from "effect/cli";

const PLATFORMS = ["linux-x64", "macos-arm64", "windows-x64"] as const;

/** @internal */
export type Platform = (typeof PLATFORMS)[number];

/** @internal */
export const platform = Argument.Literals("platform", PLATFORMS);
