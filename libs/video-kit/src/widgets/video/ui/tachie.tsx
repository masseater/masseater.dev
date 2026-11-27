import { Match, Option } from "effect";
import type { ReactNode } from "react";

import type { Tachie as TachieArt, TimedCut } from "#/entities/cut/index.ts";

import { ImageCharacter } from "./image-character.tsx";
import { PsdArt } from "./psd-art.tsx";

const NONE = "";

export const Tachie = ({
  art,
  cuts,
}: Readonly<{ art: Option.Option<TachieArt>; cuts: readonly TimedCut[] }>): ReactNode =>
  Option.match(art, {
    onNone: () => NONE,
    onSome: (found) =>
      Match.value<TachieArt>(found).pipe(
        Match.discriminatorsExhaustive("kind")({
          image: (image) => <ImageCharacter art={image} cuts={cuts} />,
          psd: (psd) => <PsdArt art={psd} cuts={cuts} />,
        }),
      ),
  });
