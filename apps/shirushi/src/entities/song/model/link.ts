import { useAtomValue } from "@effect/atom-react";
import type { Song } from "@masseater.dev/shirushi-protocol";
import { Option } from "effect";

import { pageOf } from "#/shared/lib/source";

import { songAtom } from "./song.ts";

const linkOf = (song: Option.Option<Song>): string =>
  Option.match(song, { onNone: () => "", onSome: ({ source }) => pageOf(source) });

export const useSongLink = (): string => {
  const song = useAtomValue(songAtom);
  return linkOf(song);
};
