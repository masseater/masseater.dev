import type { ReactNode } from "react";

import type { Format } from "#/shared/config/index.ts";
import { FIT, ONE } from "#/shared/config/index.ts";
import { plainOf, segmentsOf } from "#/shared/lib/segment.ts";
import { Box } from "#/shared/ui/box.tsx";
import { fitSize, innerWidth } from "#/shared/ui/fit.ts";
import { slamIn } from "#/shared/ui/motion.ts";
import { RichText } from "#/shared/ui/rich-text.tsx";
import { merge, sizeVars } from "#/shared/ui/vars.ts";

const NUMBER_ROOM = 150;
const LATEST = "bg-highlight text-ink [--emphasis:var(--color-accent)]";
const EARLIER = "bg-ink text-paper [--emphasis:var(--color-highlight)]";

const colorsOf = (latest: boolean): string => {
  if (latest) {
    return LATEST;
  }
  return EARLIER;
};

export interface PointProps {
  readonly item: string;
  readonly number: number;
  readonly format: Format;
  readonly frame: number;
  readonly at: number;
  readonly latest: boolean;
}

export const Point = ({ item, number, format, frame, at, latest }: PointProps): ReactNode => {
  const segments = segmentsOf(item);
  const size = fitSize({
    text: plainOf(segments),
    width: innerWidth(format) - NUMBER_ROOM,
    max: FIT[format].item,
    face: "bold",
  });
  return (
    <Box
      className={`motion fitted flex items-center gap-6 rounded-2xl px-7 py-5 ${colorsOf(latest)}`}
      vars={merge([sizeVars(size), slamIn({ frame, at })])}
    >
      <span className="font-jp flex-none leading-none font-black">{String(number)}</span>
      <span className="font-jp leading-snug font-bold whitespace-nowrap">
        <RichText mark={ONE} segments={segments} tone="color" />
      </span>
    </Box>
  );
};
