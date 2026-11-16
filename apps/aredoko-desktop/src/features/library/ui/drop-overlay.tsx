import { PackagePlus } from "lucide-react";
import type { ReactNode } from "react";

import { useDragOver } from "#/features/library/model/drop-state.ts";

const DROP_HERE = "ここにドロップ";

export const DropOverlay = (): ReactNode => {
  if (!useDragOver()) {
    return false;
  }
  return (
    <div className="bg-background border-primary text-primary absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed">
      <PackagePlus className="size-12" />
      <p className="text-sm">{DROP_HERE}</p>
    </div>
  );
};
