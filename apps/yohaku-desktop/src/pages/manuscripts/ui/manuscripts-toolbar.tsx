import type { ReactNode } from "react";

import { NewManuscriptButton } from "#/features/create-manuscript/index.ts";
import { SyncControl } from "#/features/sync-manuscripts/index.ts";

export const ManuscriptsToolbar = (): ReactNode => (
  <div className="flex items-center justify-between">
    <NewManuscriptButton />
    <SyncControl />
  </div>
);
