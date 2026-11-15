import type { ReactNode } from "react";

const INSTALLING = "更新中";

export const InstallProgress = ({ done }: Readonly<{ done: number }>): ReactNode => (
  <span className="text-muted-foreground px-2 tabular-nums">{`${INSTALLING} ${done.toString()}%`}</span>
);
