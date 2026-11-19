import type { MixRequest } from "@masseater.dev/fumx-studio/plugin/plugin";
import type { Bus } from "@masseater.dev/fumx-studio/studio/bus";
import { Option, String as Str, pipe } from "effect";

const LANE = /^(?:@(?<send>[a-z]+)|(?<part>[a-z]+)):/u;
const CONTINUED = /^-\d+$/u;

export const trackNameOf = (name: string): string =>
  pipe(name, Str.toLowerCase, Str.replaceAll(" ", "-"));

const laneNameOf = (stem: string, lane: string): string => {
  if (lane === stem) {
    return trackNameOf(stem);
  }
  return pipe(
    Option.fromNullishOr(LANE.exec(lane)),
    Option.flatMap((found) => Option.fromNullishOr(found.groups)),
    Option.flatMap((groups) => Option.fromNullishOr(groups["send"] ?? groups["part"])),
    Option.getOrElse(() => trackNameOf(lane)),
    (suffix) => `${trackNameOf(stem)}-${suffix}`,
  );
};

const isPartOf =
  (base: string) =>
  (name: string): boolean =>
    name === base || (Str.startsWith(base)(name) && CONTINUED.test(Str.slice(base.length)(name)));

export const lanePlayed =
  (request: MixRequest) =>
  (stem: string, lane: string) =>
  (bus: Bus): Bus => {
    const base = laneNameOf(stem, lane);
    const play = request.playInto(bus);
    for (const track of request.song.tracks) {
      if (isPartOf(base)(track.name)) {
        play(track.name);
      }
    }
    return bus;
  };
