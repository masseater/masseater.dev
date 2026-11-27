import { Option, pipe } from "effect";
import type { ReactNode } from "react";
import { Img, useCurrentFrame } from "remotion";

import type { Tachie as TachieImages, TimedCut } from "#/entities/cut/index.ts";
import { isMouthOpen } from "#/widgets/video/model/speaking.ts";

const NONE = "";

export const Tachie = ({
  images,
  cuts,
}: Readonly<{ images: Option.Option<TachieImages>; cuts: readonly TimedCut[] }>): ReactNode => {
  const frame = useCurrentFrame();
  return Option.match(images, {
    onNone: () => NONE,
    onSome: ({ closed, open }) => {
      const src = pipe(
        open,
        Option.filter(() => isMouthOpen({ cuts, frame })),
        Option.getOrElse(() => closed),
      );
      return (
        <Img
          className="tachie horizontal:tachie-h pointer-events-none absolute object-contain object-bottom"
          src={src}
        />
      );
    },
  });
};
