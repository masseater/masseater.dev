import { Option, pipe, String as Str } from "effect";

const UNKNOWN_URL = "urn:medley-manager:unknown";
const NICONICO_ID = /^(?:sm|nm|so)\d+$/u;
const YOUTUBE_ID = /^[\w-]{11}$/u;
const SECONDS_PER_MINUTE = 60;
const TIME_DIGITS = 2;

export type Watchable = Readonly<{ videoId: string | null; url: string }>;

export type WatchTarget = Readonly<{ target: Watchable; start: Option.Option<number> }>;

export type PartStartLink = Readonly<{ label: string; href: Option.Option<string> }>;

type VideoSource = Readonly<{ site: "niconico" | "youtube"; id: string }>;

const startSuffix = (separator: string, start: Option.Option<number>): string =>
  Option.match(start, {
    onNone: () => "",
    onSome: (seconds) => `${separator}${Math.floor(seconds).toString()}`,
  });

const niconicoUrl = ({ target, start }: WatchTarget): Option.Option<string> =>
  Option.fromNullOr(target.videoId).pipe(
    Option.filter((id) => NICONICO_ID.test(id)),
    Option.map((id) => `https://www.nicovideo.jp/watch/${id}${startSuffix("?from=", start)}`),
  );

const youtubeUrl = ({ target, start }: WatchTarget): Option.Option<string> =>
  Option.fromNullOr(target.videoId).pipe(
    Option.filter((id) => YOUTUBE_ID.test(id) && pipe(target.url, Str.includes("youtu"))),
    Option.map((id) => `https://www.youtube.com/watch?v=${id}${startSuffix("&t=", start)}`),
  );

const registeredUrl = ({ target }: WatchTarget): Option.Option<string> =>
  Option.some(target.url).pipe(Option.filter((url) => url !== UNKNOWN_URL));

export const watchUrl = (watch: WatchTarget): Option.Option<string> =>
  niconicoUrl(watch).pipe(
    Option.orElse(() => youtubeUrl(watch)),
    Option.orElse(() => registeredUrl(watch)),
  );

const videoSource = (target: Watchable): Option.Option<VideoSource> =>
  Option.fromNullOr(target.videoId).pipe(
    Option.filter((id) => NICONICO_ID.test(id)),
    Option.map((id): VideoSource => ({ site: "niconico", id })),
    Option.orElse(() =>
      Option.fromNullOr(target.videoId).pipe(
        Option.filter((id) => YOUTUBE_ID.test(id) && pipe(target.url, Str.includes("youtu"))),
        Option.map((id): VideoSource => ({ site: "youtube", id })),
      ),
    ),
  );

const EMBED_BASE: Readonly<Record<VideoSource["site"], string>> = {
  niconico: "https://embed.nicovideo.jp/watch/",
  youtube: "https://www.youtube-nocookie.com/embed/",
};

export const embedUrl = (target: Watchable): Option.Option<string> =>
  videoSource(target).pipe(Option.map((source) => `${EMBED_BASE[source.site]}${source.id}`));

export const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / SECONDS_PER_MINUTE);
  const rest = Math.floor(seconds % SECONDS_PER_MINUTE);
  return `${minutes.toString()}:${pipe(rest.toString(), Str.padStart(TIME_DIGITS, "0"))}`;
};

export const partStart = ({
  source,
  startSec,
}: Readonly<{ source: Watchable; startSec: number | null }>): Option.Option<PartStartLink> =>
  Option.fromNullOr(startSec).pipe(
    Option.map((start) => ({
      label: formatTime(start),
      href: watchUrl({ target: source, start: Option.some(start) }),
    })),
  );
