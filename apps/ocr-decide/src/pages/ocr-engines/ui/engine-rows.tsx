import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import { useJaBench } from "#/pages/ocr-engines/api/ja-bench-query";
import type { Column } from "#/pages/ocr-engines/model/tables";

const EngineRows = ({ columns }: Readonly<{ columns: readonly Column[] }>): ReactNode => {
  const { runs } = useJaBench();
  return (
    <tbody>
      {pipe(
        runs,
        Arr.map((run) => (
          <tr key={run.engine} className="border-t">
            <th className="px-3 py-2 text-left font-normal whitespace-nowrap">{run.label}</th>
            {pipe(
              columns,
              Arr.map(({ id, cell }) => (
                <td key={id} className="px-3 py-2 font-mono whitespace-nowrap">
                  {cell(run)}
                </td>
              )),
            )}
          </tr>
        )),
      )}
    </tbody>
  );
};

export { EngineRows };
