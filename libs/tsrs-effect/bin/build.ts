import { runMain } from "@masseater.dev/node-main";

import { buildTsrs } from "#/features/build-tsrs/index.ts";

runMain("tsrs-effect-build")(
  buildTsrs({
    directory: `${import.meta.dirname}/..`,
    platform: process.platform,
    arch: process.arch,
  }),
);
