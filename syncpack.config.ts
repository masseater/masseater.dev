import { Array as Arr, Record as Rec } from "effect";
import type { RcFile } from "syncpack";

import { requiredStack } from "./lint.config.ts";

const config: RcFile = {
  versionGroups: [
    ...Arr.map(Rec.toEntries(requiredStack), ([label, dependencies]) => ({
      label,
      dependencies: [...dependencies],
      isBanned: true,
    })),
    {
      label: "git の依存として読まれる @masseater.dev/ui の dependencies は版を直に書く",
      packages: ["@masseater.dev/ui"],
      dependencyTypes: ["prod"],
      specifierTypes: ["!exact"],
      isBanned: true,
    },
    {
      label: "@masseater.dev/ui の dependencies はカタログと別に版を持つ",
      packages: ["@masseater.dev/ui"],
      dependencyTypes: ["prod"],
      isIgnored: true,
    },
    { label: "peerDependencies は範囲で受ける", dependencyTypes: ["peer"], policy: "sameRange" },
  ],
};

export default config;
