import type { ReactNode } from "react";
import { useCallback, useSyncExternalStore } from "react";

import type { Visit } from "#/pages/mosaic/lib/files";
import { onCached, onRestored } from "#/pages/mosaic/lib/gpu-lifetime";
import { mountViewer } from "#/pages/mosaic/lib/viewer";
import { useViewerStore } from "#/pages/mosaic/model/viewer";

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

const MosaicCanvas = ({ visit }: Readonly<{ visit: Visit }>): ReactNode => {
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

export { MosaicCanvas };
