import { runMain } from "@masseater.dev/node-main";

import { buildPackage } from "#/features/build-tsrs/index.ts";

runMain("tsrs-effect-build")(
  buildPackage({
    directory: `${import.meta.dirname}/..`,
    platform: process.platform,
    arch: process.arch,
  }),
);
