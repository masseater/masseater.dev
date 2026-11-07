import { PackagePlus } from "lucide-react";
import type { ReactNode } from "react";

import { AddKnownFolderButton, AddFolderButton, ImportResult } from "#/features/library";

const DROP_HERE = "ここにドロップ";

const FirstImport = (): ReactNode => (
  <div className="flex flex-1 flex-col items-center justify-center gap-4">
    <div className="text-muted-foreground flex flex-col items-center gap-2">
      <PackagePlus className="size-12" />
      <p className="text-sm">{DROP_HERE}</p>
    </div>
    <div className="flex flex-col items-stretch gap-2">
      <AddKnownFolderButton folder="assetStore" size="lg" />
      <AddKnownFolderButton folder="blm" size="lg" />
      <AddFolderButton size="lg" />
    </div>
    <ImportResult />
  </div>
);

export { FirstImport };
