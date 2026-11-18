import type { Song } from "@masseater.dev/yogoto-protocol";
import type { ReactNode } from "react";

import { SongName } from "./song-name.tsx";

export const SongRow = ({
  song,
  selected,
  children,
  onSelect,
}: Readonly<{
  song: Song;
  selected: boolean;
  children: ReactNode;
  onSelect: () => void;
}>): ReactNode => (
  <button
    type="button"
    aria-pressed={selected}
    onClick={onSelect}
    className="hover:bg-muted aria-pressed:border-foreground flex w-full items-center justify-between gap-3 rounded-md border px-3 py-2 text-left"
  >
    <SongName song={song} />
    {children}
  </button>
);
