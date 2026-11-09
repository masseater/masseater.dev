import { cn } from "@masseater.dev/ui/cn";
import type { ReactNode } from "react";

const NumberCell = ({
  full,
  compact,
  tone = "",
}: Readonly<{ full: string; compact: string; tone?: string }>): ReactNode => (
  <td className={cn("py-2 pl-2 text-right align-top whitespace-nowrap tabular-nums", tone)}>
    <span className="sm:hidden">{compact}</span>
    <span className="hidden sm:inline">{full}</span>
  </td>
);

export { NumberCell };
