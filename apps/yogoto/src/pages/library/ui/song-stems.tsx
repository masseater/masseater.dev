import type { Song } from "@masseater.dev/yogoto-protocol";
import { convertFileSrc } from "@tauri-apps/api/core";
import { Array as Arr, Option, pipe } from "effect";
import type { ReactNode } from "react";

import { StemDeck } from "#/features/play-stems/index.ts";
import { LABELS } from "#/shared/config/index.ts";

import { EmptyNote } from "./empty-note.tsx";

const urlsOf =
  (folder: string) =>
  (song: Song): Option.Option<readonly string[]> =>
    Option.map(Arr.last(song.separations), (separation) =>
      pipe(
        separation.stems,
        Arr.map(({ file }) => convertFileSrc(`${folder}/${file}`)),
      ),
    );

const unseparated = (): ReactNode => <EmptyNote text={LABELS.notSeparated} />;

const deck = (urls: readonly string[]): ReactNode => (
  <StemDeck key={Arr.join(urls, "\n")} urls={urls} />
);

export const SongStems = ({ song, folder }: Readonly<{ song: Song; folder: string }>): ReactNode =>
  Option.match(urlsOf(folder)(song), { onNone: unseparated, onSome: deck });
