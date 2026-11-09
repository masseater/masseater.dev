import type { ReactNode } from "react";

import { useExpanded } from "#/pages/ranking/model/expanded";
import type { Ranked } from "#/pages/ranking/model/ranking";

import { SummaryRow } from "./summary-row";
import { VideoRow } from "./video-row";

const SongRow = ({ entry, rank }: Readonly<{ entry: Ranked; rank: number }>): ReactNode => {
  const [open, toggle] = useExpanded(entry.id);
  return (
    <>
      <SummaryRow entry={entry} rank={rank} open={open} onToggle={toggle} />
      {open && <VideoRow id={entry.id} />}
    </>
  );
};

export { SongRow };
