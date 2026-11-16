import type { ReactNode } from "react";
import { useCallback, useSyncExternalStore } from "react";

import type { Visit } from "#/entities/mosaic/lib/files.ts";
import { onCached, onRestored } from "#/entities/mosaic/lib/gpu-lifetime.ts";
import { mountViewer } from "#/entities/mosaic/lib/viewer.ts";
import { useViewerStore } from "#/entities/mosaic/model/viewer.ts";

const LABEL =
  "モザイクアート。ドラッグで移動、ホイールかピンチで拡大、サムネイルを押すと動画の情報が出ます";

const NEVER_RESTORED = 0;
const NEXT = 1;

const restores = { count: NEVER_RESTORED };

const subscribeRestores = (changed: () => void): (() => void) =>
  onRestored(globalThis)(() => {
    restores.count += NEXT;
    changed();
  });

const restoreCount = (): number => restores.count;

const serverRestoreCount = (): number => NEVER_RESTORED;

export const MosaicCanvas = ({ visit }: Readonly<{ visit: Visit }>): ReactNode => {
  const store = useViewerStore();
  const restored = useSyncExternalStore(subscribeRestores, restoreCount, serverRestoreCount);
  const attach = useCallback(
    (canvas: HTMLCanvasElement): (() => void) => {
      const unmount = mountViewer({ canvas, visit, store });
      const stopWatching = onCached(globalThis)(unmount);
      return () => {
        stopWatching();
        unmount();
      };
    },
    [visit, store],
  );
  return (
    <canvas
      key={restored}
      ref={attach}
      aria-label={LABEL}
      className="absolute inset-0 size-full cursor-grab touch-none active:cursor-grabbing"
    />
  );
};
