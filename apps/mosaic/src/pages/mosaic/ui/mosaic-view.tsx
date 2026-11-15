import type { ReactNode } from "react";
import { useMemo } from "react";

import type { Visit } from "#/entities/mosaic";
import { useViewerStatus, MosaicCanvas } from "#/entities/mosaic";

import { MosaicLoading } from "./mosaic-loading";
import { MosaicOverlay } from "./mosaic-overlay";

const MosaicView = ({ slug, seed, choice, mosaic }: Visit): ReactNode => {
  const visit = useMemo(() => ({ slug, seed, choice, mosaic }), [slug, seed, choice, mosaic]);
  const ready = useViewerStatus() === "ready";
  return (
    <>
      <MosaicCanvas visit={visit} />
      {ready && <MosaicOverlay visit={visit} />}
      {!ready && <MosaicLoading />}
    </>
  );
};

export { MosaicView };
