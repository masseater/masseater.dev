import type { ReactNode } from "react";

export const TableFrame = ({
  children,
  label,
}: Readonly<{ children: ReactNode; label: string }>): ReactNode => (
  <div className="overflow-x-auto">
    <table aria-label={label} className="w-full min-w-xl text-sm">
      {children}
    </table>
  </div>
);
