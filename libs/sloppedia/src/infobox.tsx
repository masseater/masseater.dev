import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import type { InfoboxRow } from "./article.ts";
import { InfoboxLine } from "./infobox-line.tsx";

const Infobox = ({
  title,
  rows,
}: Readonly<{ title: string; rows: readonly InfoboxRow[] }>): ReactNode =>
  Arr.isReadonlyArrayNonEmpty(rows) && (
    <table className="bg-wiki-surface border-wiki-border mb-4 w-full border text-sm md:float-right md:ms-6 md:w-80">
      <caption className="pb-1 text-base font-bold">{title}</caption>
      <tbody>
        {pipe(
          rows,
          Arr.map((row) => <InfoboxLine key={row.label} row={row} />),
        )}
      </tbody>
    </table>
  );

export { Infobox };
