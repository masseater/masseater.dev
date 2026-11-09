import { cn } from "@masseater.dev/ui/cn";
import { Option } from "effect";
import type { ReactNode } from "react";

import { compactGap, compactViews, gap, views } from "#/pages/ranking/model/format";
import type { Ranked } from "#/pages/ranking/model/ranking";

import { NumberCell } from "./number-cell";
import { SongCell } from "./song-cell";

const YOUTUBE_LEADS = "text-youtube-lead";
const NICO_LEADS = "text-nico-lead";
const NO_GAP = "text-muted-foreground";
const ZERO = 0;

const gapTone = (value: Option.Option<number>): string =>
  Option.match(value, {
    onNone: () => NO_GAP,
    onSome: (count) => cn(count >= ZERO && YOUTUBE_LEADS, count < ZERO && NICO_LEADS),
  });

const SummaryRow = ({
  entry,
  rank,
  open,
  onToggle,
}: Readonly<{ entry: Ranked; rank: number; open: boolean; onToggle: () => void }>): ReactNode => (
  <tr className="hover:bg-muted/50 border-b">
    <td className="text-muted-foreground py-2 pr-2 text-right align-top tabular-nums">{rank}</td>
    <td className="py-2 align-top">
      <SongCell entry={entry} open={open} onToggle={onToggle} />
    </td>
    <NumberCell full={views(entry.nico)} compact={compactViews(entry.nico)} />
    <NumberCell full={views(entry.youtube)} compact={compactViews(entry.youtube)} />
    <NumberCell full={gap(entry.gap)} compact={compactGap(entry.gap)} tone={gapTone(entry.gap)} />
  </tr>
);

export { SummaryRow };
