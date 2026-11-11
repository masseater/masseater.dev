import type { ReactNode } from "react";

const SettingRow = ({
  label,
  children,
}: Readonly<{ label: string; children: ReactNode }>): ReactNode => (
  <div className="flex flex-wrap items-center gap-2">
    <span className="text-muted-foreground w-20 shrink-0 text-xs">{label}</span>
    {children}
  </div>
);

export { SettingRow };
