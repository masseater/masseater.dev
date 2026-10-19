import type { RcFile } from "syncpack";

import { requiredStack } from "./lint.config.ts";

const config: RcFile = {
  versionGroups: [
    ...Object.entries(requiredStack).map(([label, dependencies]) => ({
      label,
      dependencies: [...dependencies],
      isBanned: true,
    })),
    { label: "peerDependencies は範囲で受ける", dependencyTypes: ["peer"], policy: "sameRange" },
  ],
};

export default config;
