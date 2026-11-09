import { Array as Arr, Record as Rec } from "effect";
import { INSTRUMENTATION, requiredStack } from "oxlint-masseater-plugin";
import type { RcFile } from "syncpack";

const config: RcFile = {
  versionGroups: [
    {
      label: "OTLP の受け口は OpenTelemetry の SDK から送ってテストする",
      dependencies: [...(requiredStack[INSTRUMENTATION] ?? [])],
      packages: ["@r_masseater/vitest-otlp"],
      dependencyTypes: ["dev"],
    },
    {
      label: "OTLP の受け口のテストが使う OpenTelemetry の SDK の版",
      dependencies: [...(requiredStack[INSTRUMENTATION] ?? [])],
      packages: ["pnpm-workspace.yaml"],
    },
    {
      label: "Workers のスパンは Miniflare で Worker を動かしてテストする",
      dependencies: ["miniflare"],
      packages: ["@r_masseater/vitest-otlp", "@r_masseater/workers-tracing"],
      dependencyTypes: ["dev"],
    },
    {
      label: "Workers のスパンのテストが使う Miniflare の版",
      dependencies: ["miniflare"],
      packages: ["pnpm-workspace.yaml"],
    },
    ...Arr.map(Rec.toEntries(requiredStack), ([label, dependencies]) => ({
      label,
      dependencies: [...dependencies],
      isBanned: true,
    })),
    { label: "peerDependencies は範囲で受ける", dependencyTypes: ["peer"], policy: "sameRange" },
  ],
};

export default config;
