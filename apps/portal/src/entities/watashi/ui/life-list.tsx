import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import type { LifeItemValue } from "#/entities/watashi/model/life-item.ts";
import { RowList } from "#/shared/ui/index.ts";

import { LifeRow } from "./life-row.tsx";

export const LifeList = ({
  items,
  label,
}: Readonly<{ items: readonly LifeItemValue[]; label: string }>): ReactNode => (
  <RowList label={label}>
    {pipe(
      items,
      Arr.map((item) => <LifeRow item={item} key={item.ref} />),
    )}
  </RowList>
);
