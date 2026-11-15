import type { Option } from "effect";
import type { ReactNode } from "react";

import type { PartRow } from "#/entities/part/lib/part";
import type { PartStartLink } from "#/entities/video/@x/part";

import { PositionMark } from "./position-mark";
import { SetlistBody } from "./setlist-body";

export const SetlistItem = ({
  part,
  start,
}: Readonly<{ part: PartRow; start: Option.Option<PartStartLink> }>): ReactNode => (
  <li className="hover:bg-muted flex gap-3 px-3 py-3 transition-colors sm:gap-4 sm:px-5">
    <PositionMark position={part.position} />
    <SetlistBody part={part} start={start} />
  </li>
);
