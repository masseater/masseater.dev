import type { ReactNode } from "react";

import type { Ranked } from "#/pages/ranking/model/ranking";

const SongCell = ({
  entry,
  open,
  onToggle,
}: Readonly<{ entry: Ranked; open: boolean; onToggle: () => void }>): ReactNode => (
  <button type="button" aria-expanded={open} onClick={onToggle} className="text-left">
    <span className="font-medium">{entry.name}</span>
    <span className="text-muted-foreground flex flex-wrap gap-x-3 text-xs">
      <span>{entry.artist}</span>
      <span>{entry.published}</span>
    </span>
  </button>
);

export { SongCell };
