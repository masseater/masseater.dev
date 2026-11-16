import { useAtomValue } from "@effect/atom-react";
import { Option } from "effect";

import type { Song } from "#protocol";
import { pageOf } from "#source";

import { songAtom } from "./song.ts";

const linkOf = (song: Option.Option<Song>): string =>
  Option.match(song, { onNone: () => "", onSome: ({ source }) => pageOf(source) });

export const useSongLink = (): string => {
  const song = useAtomValue(songAtom);
  return linkOf(song);
};
