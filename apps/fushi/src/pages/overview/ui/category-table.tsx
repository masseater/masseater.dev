import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import type { Library, Style } from "#/entities/library/index.ts";
import { CATEGORIES } from "#/shared/config/index.ts";

import { CategoryHead } from "./category-head.tsx";
import { CategoryRow } from "./category-row.tsx";

export const CategoryTable = ({
  library,
  current: style,
}: Readonly<{ library: Library; current: Style }>): ReactNode => (
  <table className="w-full text-sm">
    <thead className="text-muted-foreground border-b text-left text-xs">
      <CategoryHead />
    </thead>
    <tbody>
      {pipe(
        CATEGORIES,
        Arr.map((category) => (
          <CategoryRow key={category.id} library={library} current={style} category={category} />
        )),
      )}
    </tbody>
  </table>
);
