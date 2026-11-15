import type { ReactNode } from "react";

import { NewManuscriptButton } from "#/features/create-manuscript";
import { SyncControl } from "#/features/sync-manuscripts";

export const ManuscriptsToolbar = (): ReactNode => (
  <div className="flex items-center justify-between">
    <NewManuscriptButton />
    <SyncControl />
  </div>
);
