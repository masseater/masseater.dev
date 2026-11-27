import { PsdCharacter } from "@masseater.dev/tachie";
import { Option } from "effect";
import type { ReactNode } from "react";

import type { PsdTachie, TimedCut } from "#/entities/cut/index.ts";
import { PLACEMENT } from "#/widgets/video/model/placement.ts";
import { voicesOf } from "#/widgets/video/model/voices.ts";

export const PsdArt = ({
  art,
  cuts,
}: Readonly<{ art: PsdTachie; cuts: readonly TimedCut[] }>): ReactNode => (
  <PsdCharacter
    className={PLACEMENT}
    favorites={Option.getOrUndefined(art.favorites)}
    parts={art.parts}
    psd={art.psd}
    voices={voicesOf(cuts)}
  />
);
