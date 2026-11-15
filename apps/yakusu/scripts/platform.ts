import { Argument } from "effect/cli";

const PLATFORMS = ["linux-x64", "macos-arm64", "windows-x64"] as const;

type Platform = (typeof PLATFORMS)[number];

const platform = Argument.Literals("platform", PLATFORMS);

/** @internal */
export { platform };
/** @internal */
export type { Platform };
