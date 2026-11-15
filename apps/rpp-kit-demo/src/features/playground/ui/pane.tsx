import type { ReactNode } from "react";

import type { Pane as PaneName } from "#/features/playground/model/mount";

export const Pane = ({
  name,
  active,
}: Readonly<{ name: PaneName; active: boolean }>): ReactNode => (
  <div data-pane={name} hidden={!active} className="h-full min-h-0" />
);
