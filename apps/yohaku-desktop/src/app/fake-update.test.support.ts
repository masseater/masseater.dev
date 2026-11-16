import type { Option } from "effect";
import { Effect, Stream } from "effect";

import type { Release, Yohaku } from "#/shared/api/index.ts";

export const DOWNLOADED = 40;

export const updateCalls = (
  release: Option.Option<Release>,
): Pick<Yohaku, "checkUpdate" | "installUpdate"> => ({
  checkUpdate: () => Effect.succeed(release),
  installUpdate: () => Stream.concat(Stream.make(DOWNLOADED), Stream.never),
});
