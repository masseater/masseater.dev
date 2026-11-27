import type { ReactNode } from "react";

import type { Line } from "#/entities/script/index.ts";
import { textOf } from "#/entities/script/index.ts";
import type { Format } from "#/shared/config/index.ts";
import { FIT, ONE } from "#/shared/config/index.ts";
import { Box } from "#/shared/ui/box.tsx";
import { fitSize, innerWidth } from "#/shared/ui/fit.ts";
import { slamIn } from "#/shared/ui/motion.ts";
import { RichText } from "#/shared/ui/rich-text.tsx";
import { merge, sizeVars } from "#/shared/ui/vars.ts";

const LATEST = "bg-telop";
const EARLIER = "bg-paper";
const CARD_CHROME = 160;

const backgroundOf = (latest: boolean): string => {
  if (latest) {
    return LATEST;
  }
  return EARLIER;
};

export interface PointCardProps {
  readonly item: Line;
  readonly number: number;
  readonly format: Format;
  readonly at: number;
  readonly frame: number;
  readonly latest: boolean;
}

export const PointCard = ({
  item,
  number,
  format,
  at,
  frame,
  latest,
}: PointCardProps): ReactNode => {
  const size = fitSize({
    text: textOf(item),
    width: innerWidth(format) - CARD_CHROME,
    max: FIT[format].item,
    face: "text",
  });
  return (
    <Box
      className={`motion sticker fitted flex items-center gap-6 px-6 py-4 ${backgroundOf(latest)}`}
      vars={merge([sizeVars(size), slamIn({ frame, at })])}
    >
      <span className="font-pop text-accent flex-none leading-none">{String(number)}</span>
      <span className="font-text text-ink leading-snug font-extrabold whitespace-nowrap">
        <RichText mark={ONE} segments={item.segments} />
      </span>
    </Box>
  );
};
