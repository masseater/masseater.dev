import { Array as Arr, Match, Option, String as Str, pipe } from "effect";

import type { Source } from "#/shared/api/index.ts";

type Address = Readonly<{ host: string; parts: readonly string[]; video: Option.Option<string> }>;

type Reader = (address: Address) => Option.Option<Source>;

export type Moment = Readonly<{ source: Source; seconds: number }>;

const SECONDS_PER_MINUTE = 60;
const NICONICO_ID = /^(?:sm|so|nm)\d+$/u;
const YOUTUBE_ID = /^[\w-]{11}$/u;
const SECOND_PART = 1;
const TRACK_PARTS = 2;
const START = 0;
const CLOCK_DIGITS = 2;
const NESTED_YOUTUBE = new Set(["shorts", "live", "embed"]);

const youtube = (id: Option.Option<string>): Option.Option<Source> =>
  pipe(
    id,
    Option.filter((value) => YOUTUBE_ID.test(value)),
    Option.map((value) => ({ site: "youtube" as const, id: value })),
  );

const niconico = (id: Option.Option<string>): Option.Option<Source> =>
  pipe(
    id,
    Option.filter((value) => NICONICO_ID.test(value)),
    Option.map((value) => ({ site: "niconico" as const, id: value })),
  );

const youtubeId = ({ parts, video }: Address): Option.Option<string> =>
  pipe(
    Arr.head(parts),
    Option.flatMap((first) => {
      if (first === "watch") {
        return video;
      }
      return pipe(
        Option.liftPredicate(first, (name) => NESTED_YOUTUBE.has(name)),
        Option.flatMap(() => Arr.get(parts, SECOND_PART)),
      );
    }),
  );

const soundcloud = ({ parts }: Address): Option.Option<Source> =>
  pipe(
    Option.liftPredicate(parts, (all) => all.length === TRACK_PARTS),
    Option.map((all) => ({ site: "soundcloud" as const, id: Arr.join(all, "/") })),
  );

const READERS: Readonly<Record<string, Reader>> = {
  "youtube.com": (address) => youtube(youtubeId(address)),
  "youtu.be": ({ parts }) => youtube(Arr.head(parts)),
  "nicovideo.jp": ({ parts }) => niconico(Arr.get(parts, SECOND_PART)),
  "nico.ms": ({ parts }) => niconico(Arr.head(parts)),
  "soundcloud.com": soundcloud,
};

const addressOf = (text: string): Option.Option<Address> =>
  pipe(
    Option.liftPredicate(Str.trim(text), (value) => URL.canParse(value)),
    Option.map((value) => {
      const url = new URL(value);
      return {
        host: Str.replace(/^(?:www|m|music|sp)\./u, "")(url.hostname),
        parts: pipe(url.pathname, Str.split("/"), Arr.filter(Str.isNonEmpty)),
        video: Option.fromNullishOr(url.searchParams.get("v")),
      };
    }),
  );

export const sourceOf = (text: string): Option.Option<Source> =>
  pipe(
    addressOf(text),
    Option.flatMap((address) =>
      pipe(
        Option.fromUndefinedOr(READERS[address.host]),
        Option.flatMap((read) => read(address)),
      ),
    ),
  );

const whole = (seconds: number): number => Math.max(Math.floor(seconds), START);

export const clock = (seconds: number): string => {
  const total = whole(seconds);
  const minutes = Math.floor(total / SECONDS_PER_MINUTE);
  return `${minutes}:${Str.padStart(CLOCK_DIGITS, "0")(String(total % SECONDS_PER_MINUTE))}`;
};

export const linkAt = ({ source, seconds }: Moment): string =>
  Match.value(source.site).pipe(
    Match.when("youtube", () => `https://youtu.be/${source.id}?t=${whole(seconds)}`),
    Match.when(
      "niconico",
      () => `https://www.nicovideo.jp/watch/${source.id}?from=${whole(seconds)}`,
    ),
    Match.when("soundcloud", () => `https://soundcloud.com/${source.id}#t=${clock(seconds)}`),
    Match.exhaustive,
  );

export const pageOf = ({ site, id }: Source): string =>
  Match.value(site).pipe(
    Match.when("youtube", () => `https://www.youtube.com/watch?v=${id}`),
    Match.when("niconico", () => `https://www.nicovideo.jp/watch/${id}`),
    Match.when("soundcloud", () => `https://soundcloud.com/${id}`),
    Match.exhaustive,
  );
