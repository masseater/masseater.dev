import { Array as Arr } from "effect";
import type { ReactNode } from "react";

import { countsOf } from "#/entities/library/index.ts";
import type { Library, Style } from "#/entities/library/index.ts";
import { LABELS } from "#/shared/config/index.ts";
import type { Category } from "#/shared/config/index.ts";
import { hrefOf } from "#/shared/lib/index.ts";

export const CategoryRow = ({
  library,
  current: style,
  category,
}: Readonly<{ library: Library; current: Style; category: Category }>): ReactNode => {
  const counts = countsOf(library)({ style: style.id, category: category.id });
  return (
    <tr className="hover:bg-muted/50 border-b">
      <td className="p-2 font-semibold">
        <a href={hrefOf({ page: "category", style: style.id, category: category.id })}>
          {category.name}
        </a>
      </td>
      <td className="text-muted-foreground p-2">{Arr.join(category.views, LABELS.comma)}</td>
      <td className="p-2 text-right tabular-nums">{counts.aims}</td>
      <td className="p-2 text-right tabular-nums">{counts.rules}</td>
      <td className="p-2 text-right tabular-nums">{counts.suggestions}</td>
    </tr>
  );
};
