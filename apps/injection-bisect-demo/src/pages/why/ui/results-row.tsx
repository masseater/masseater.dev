import type { ReactNode } from "react";

import type { Row } from "#/pages/why/model/results";

const ResultsRow = ({ row }: Readonly<{ row: Row }>): ReactNode => (
  <tr className="border-t">
    <th className="px-3 py-2 text-left font-normal">{row.label}</th>
    <td className="px-3 py-2 font-mono whitespace-nowrap">{row.ours}</td>
    <td className="px-3 py-2 font-mono whitespace-nowrap">{row.direct}</td>
  </tr>
);

export { ResultsRow };
