import type { ReactNode } from "react";

const ResultRow = ({ label, value }: Readonly<{ label: string; value: string }>): ReactNode => (
  <tr className="border-t">
    <th className="text-muted-foreground px-3 py-2 text-left font-normal whitespace-nowrap">
      {label}
    </th>
    <td className="px-3 py-2">{value}</td>
  </tr>
);

export { ResultRow };
