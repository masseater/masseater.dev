import type { Opened, Source } from "@masseater.dev/media-notes-protocol";
import { Match, Option } from "effect";
import { Atom } from "effect/reactivity";

/** @internal */
export const openedAtom = Atom.make(Option.none<Opened>()).pipe(Atom.keepAlive);

export const keyOf = ({ site, id }: Source): string => `${site}:${id}`;

export const pageOf = ({ site, id }: Source): Option.Option<string> =>
  Match.value(site).pipe(
    Match.when("youtube", () => Option.some(`https://www.youtube.com/watch?v=${id}`)),
    Match.when("niconico", () => Option.some(`https://www.nicovideo.jp/watch/${id}`)),
    Match.when("soundcloud", () => Option.some(`https://soundcloud.com/${id}`)),
    Match.when("file", () => Option.none()),
    Match.exhaustive,
  );
