import type { Summary } from "@masseater.dev/aredoko-protocol";
import { Array, pipe } from "effect";
import type { ReactNode } from "react";

import { KIND_LABELS } from "#/pages/home/config";
import { Badge } from "#/shared/ui/badge";

const KindCounts = ({
  counts,
}: Readonly<{ counts: (typeof Summary.Type)["counts"] }>): ReactNode => (
  <div className="flex flex-wrap gap-1.5">
    {pipe(
      counts,
      Array.filter(({ kind }) => kind !== "other"),
      Array.map(({ kind, count }) => (
        <Badge key={kind} variant="secondary">{`${KIND_LABELS[kind]} ${count.toString()}`}</Badge>
      )),
    )}
  </div>
);

export { KindCounts };
