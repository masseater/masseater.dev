import type { Option } from "effect";
import type { ReactNode } from "react";

import type { PartRow } from "#/entities/catalog/lib/part";
import type { PartStartLink } from "#/entities/catalog/lib/watch-url";

import { PositionMark } from "./position-mark";
import { SetlistBody } from "./setlist-body";

const SetlistItem = ({
  part,
  start,
}: Readonly<{ part: PartRow; start: Option.Option<PartStartLink> }>): ReactNode => (
  <li className="hover:bg-muted flex gap-3 px-3 py-3 transition-colors sm:gap-4 sm:px-5">
    <PositionMark position={part.position} />
    <SetlistBody part={part} start={start} />
  </li>
);

export { SetlistItem };
