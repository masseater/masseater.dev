import { runMain } from "@masseater.dev/node-main";
import { Match, pipe } from "effect";

import { cargo } from "./bundled.ts";

const task = pipe(
  Match.value(process.platform),
  Match.when("darwin", () => "bundle-universal-all"),
  Match.orElse(() => "bundle-all"),
);

runMain("pod-rattle-bundle")(cargo(["--package", "xtask", "--release", "--", task, "--release"]));
