import type { Source } from "@masseater.dev/shirushi-protocol";
import { Match, String as Str } from "effect";

const SECONDS_PER_MINUTE = 60;
const START = 0;
const CLOCK_DIGITS = 2;

const whole = (seconds: number): number => Math.max(Math.floor(seconds), START);

export const clock = (seconds: number): string => {
  const total = whole(seconds);
  const minutes = Math.floor(total / SECONDS_PER_MINUTE);
  return `${minutes}:${Str.padStart(CLOCK_DIGITS, "0")(String(total % SECONDS_PER_MINUTE))}`;
};

export const pageOf = ({ site, id }: Source): string =>
  Match.value(site).pipe(
    Match.when("youtube", () => `https://www.youtube.com/watch?v=${id}`),
    Match.when("niconico", () => `https://www.nicovideo.jp/watch/${id}`),
    Match.when("soundcloud", () => `https://soundcloud.com/${id}`),
    Match.exhaustive,
  );
