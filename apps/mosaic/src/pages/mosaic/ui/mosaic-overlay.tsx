import { Option, pipe } from "effect";
import type { ReactNode } from "react";

import { tileCrop, useTile, useArrival, useSelection } from "#/entities/mosaic/index.ts";
import type { Visit } from "#/entities/mosaic/index.ts";
import { TileCard } from "#/features/inspect-tile/index.ts";

import { MosaicChrome } from "./mosaic-chrome";

export const MosaicOverlay = ({ visit }: Readonly<{ visit: Visit }>): ReactNode => {
  const selection = useSelection();
  const selected = Option.all({
    tile: useTile(selection),
    crop: pipe(
      selection,
      Option.flatMap((index) => tileCrop({ visit, index })),
    ),
  });
  const arrived = useArrival() === "arrived";
  return (
    <>
      {arrived && <MosaicChrome slug={visit.slug} seed={visit.seed} />}
      {Option.isSome(selected) && (
        <TileCard tile={selected.value.tile} crop={selected.value.crop} />
      )}
    </>
  );
};
