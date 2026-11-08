import { Array as Arr, Record as Rec } from "effect";
import { requiredStack } from "oxlint-masseater-plugin";
import type { RcFile } from "syncpack";

const config: RcFile = {
  versionGroups: [
    ...Arr.map(Rec.toEntries(requiredStack), ([label, dependencies]) => ({
      label,
      dependencies: [...dependencies],
      isBanned: true,
    })),
    { label: "peerDependencies は範囲で受ける", dependencyTypes: ["peer"], policy: "sameRange" },
  ],
};

export default config;
