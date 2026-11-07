import type { SearchResult } from "@masseater.dev/aredoko-protocol";

import { KIND_LABELS } from "#/pages/home/config";

const originOf = ({
  kind,
  packageName,
}: Pick<typeof SearchResult.Type, "kind" | "packageName">): string =>
  `${KIND_LABELS[kind]}・${packageName}`;

export { originOf };
