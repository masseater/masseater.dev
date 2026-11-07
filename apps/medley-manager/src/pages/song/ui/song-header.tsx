import { useMemo } from "react";
import type { ReactNode } from "react";

import { useSong } from "#/pages/song/api/use-song";
import { Facts } from "#/shared/ui/facts";
import { Note } from "#/shared/ui/note";

import { OriginalLink } from "./original-link";
import { SongAliases } from "./song-aliases";
import { UsageCounter } from "./usage-counter";

const KICKER = "♪ 曲";

const SongHeader = (): ReactNode => {
  const song = useSong();
  const facts = useMemo(() => [song.artist, song.genre], [song]);
  return (
    <header className="bg-screen flex flex-col gap-6 rounded-xl border p-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex flex-col items-start gap-3">
        <span className="text-comment-cyan text-sm font-bold">{KICKER}</span>
        <h1 className="font-display text-3xl leading-snug sm:text-4xl">{song.title}</h1>
        <Facts values={facts} />
        <SongAliases aliases={song.aliases} />
        <OriginalLink url={song.url} />
        <Note text={song.note} />
      </div>
      <div className="flex shrink-0 gap-3">
        <UsageCounter label="使われた動画" value={song.direct.length} />
        <UsageCounter label="引用経由" value={song.indirect.length} />
      </div>
    </header>
  );
};

export { SongHeader };
