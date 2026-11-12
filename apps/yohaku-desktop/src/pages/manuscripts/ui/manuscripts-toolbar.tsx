import type { ReactNode } from "react";

import { NewManuscriptButton } from "./new-manuscript-button.tsx";
import { SyncControl } from "./sync-control.tsx";

const ManuscriptsToolbar = (): ReactNode => (
  <div className="flex items-center justify-between">
    <NewManuscriptButton />
    <SyncControl />
  </div>
);

export { ManuscriptsToolbar };
