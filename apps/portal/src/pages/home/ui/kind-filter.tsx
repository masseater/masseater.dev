import { Array as Arr, Option, pipe } from "effect";
import type { ReactNode } from "react";

import { ACTIVITY_KINDS, KIND_LABELS } from "#/pages/home/model/activity.ts";
import type { ActivityKind } from "#/pages/home/model/activity.ts";

import { KindChip } from "./kind-chip";

const ALL = "すべて";

const LABEL = "種類で絞り込む";

const EVERY = Option.none<ActivityKind>();

export const KindFilter = ({
  current,
}: Readonly<{ current: Option.Option<ActivityKind> }>): ReactNode => (
  <nav aria-label={LABEL}>
    <ul className="flex flex-wrap gap-2">
      <KindChip current={Option.isNone(current)} kind={EVERY} label={ALL} />
      {pipe(
        ACTIVITY_KINDS,
        Arr.map((kind) => (
          <KindChip
            current={Option.contains(current, kind)}
            key={kind}
            kind={Option.some(kind)}
            label={KIND_LABELS[kind]}
          />
        )),
      )}
    </ul>
  </nav>
);
