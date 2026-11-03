import type { ReactNode } from "react";

import type { InfoboxRow } from "#/entities/entry";

import { InfoboxValue } from "./infobox-value";

const InfoboxLine = ({ row }: Readonly<{ row: InfoboxRow }>): ReactNode => (
  <tr className="align-top">
    <th className="w-1/3 px-2 py-1 text-start font-bold" scope="row">
      {row.label}
    </th>
    <td className="px-2 py-1 break-words">
      <InfoboxValue row={row} />
    </td>
  </tr>
);

export { InfoboxLine };
