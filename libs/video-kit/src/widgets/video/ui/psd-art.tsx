import { PsdCharacter } from "@masseater.dev/tachie";
import { Option } from "effect";
import type { ReactNode } from "react";

import { recordingsOf } from "#/entities/cut/index.ts";
import type { PsdTachie, TimedCut } from "#/entities/cut/index.ts";
import { PLACEMENT } from "#/widgets/video/model/placement.ts";

export const PsdArt = ({
  art,
  cuts,
}: Readonly<{ art: PsdTachie; cuts: readonly TimedCut[] }>): ReactNode => (
  <PsdCharacter
    className={PLACEMENT}
    favorites={Option.getOrUndefined(art.favorites)}
    parts={art.parts}
    psd={art.psd}
    voices={recordingsOf(cuts)}
  />
);
