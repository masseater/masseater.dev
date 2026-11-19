import type { ReactNode } from "react";

const FOCUSABLE = 0;

export const TableFrame = ({
  children,
  label,
}: Readonly<{ children: ReactNode; label: string }>): ReactNode => (
  <section aria-label={label} className="overflow-x-auto" tabIndex={FOCUSABLE}>
    <table aria-label={label} className="w-full min-w-xl text-sm">
      {children}
    </table>
  </section>
);
