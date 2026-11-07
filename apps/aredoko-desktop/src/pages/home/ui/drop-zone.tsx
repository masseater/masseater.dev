import { useCallback } from "react";
import type { ReactNode } from "react";

import { useImportFiles } from "#/features/library";
import { subscribeDrops } from "#/pages/home/api/drop-events";
import { useSetDragOver } from "#/pages/home/model";

import { DropOverlay } from "./drop-overlay.tsx";

const DropZone = ({ children }: Readonly<{ children: ReactNode }>): ReactNode => {
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

export { DropZone };
