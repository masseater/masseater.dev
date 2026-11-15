import { useCallback } from "react";
import type { ReactNode } from "react";

import { subscribeDrops } from "#/features/library/api/drop-events";
import { useImportFiles } from "#/features/library/api/queries";
import { useSetDragOver } from "#/features/library/model/drop-state";

import { DropOverlay } from "./drop-overlay.tsx";

export const DropZone = ({ children }: Readonly<{ children: ReactNode }>): ReactNode => {
  const setDragOver = useSetDragOver();
  const { mutate: importFiles } = useImportFiles();
  const listen = useCallback(
    () => subscribeDrops({ onHover: setDragOver, onDrop: importFiles }),
    [setDragOver, importFiles],
  );
  return (
    <div ref={listen} className="relative flex min-h-0 flex-1 flex-col">
      {children}
      <DropOverlay />
    </div>
  );
};
