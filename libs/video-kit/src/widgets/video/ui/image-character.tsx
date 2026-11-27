import { Option, pipe } from "effect";
import type { ReactNode } from "react";
import { Img, useCurrentFrame } from "remotion";

import type { ImageTachie, TimedCut } from "#/entities/cut/index.ts";
import { PLACEMENT } from "#/widgets/video/model/placement.ts";
import { isMouthOpen } from "#/widgets/video/model/speaking.ts";

export const ImageCharacter = ({
  art,
  cuts,
}: Readonly<{ art: ImageTachie; cuts: readonly TimedCut[] }>): ReactNode => {
  const frame = useCurrentFrame();
  const src = pipe(
    art.open,
    Option.filter(() => isMouthOpen({ cuts, frame })),
    Option.getOrElse(() => art.closed),
  );
  return <Img className={PLACEMENT} src={src} />;
};
