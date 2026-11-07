import type { Option } from "effect";
import type { ReactNode } from "react";

import type { PartRow } from "#/entities/catalog/lib/part";
import type { PartStartLink } from "#/entities/catalog/lib/watch-url";

import { PartFacts } from "./part-facts";
import { PartMaterial } from "./part-material";
import { PartStaff } from "./part-staff";
import { PartStart } from "./part-start";

const SetlistBody = ({
  part,
  start,
}: Readonly<{ part: PartRow; start: Option.Option<PartStartLink> }>): ReactNode => (
  <span className="flex min-w-0 flex-1 flex-col gap-2">
    <span className="flex flex-wrap items-start gap-2">
      <PartStart start={start} />
      <PartMaterial part={part} />
    </span>
    <span className="flex flex-wrap items-center gap-2">
      <PartFacts part={part} />
      <PartStaff part={part} staffRole="audio" />
      <PartStaff part={part} staffRole="video" />
      <PartStaff part={part} staffRole="other" />
    </span>
    {part.note !== null && <span className="text-muted-foreground text-xs">{part.note}</span>}
    {part.comment !== null && <span className="text-sm">{part.comment}</span>}
  </span>
);

export { SetlistBody };
