import type { Opened } from "@masseater.dev/media-notes-protocol";
import type { Range } from "@masseater.dev/media-notes-ui";
import { convertFileSrc } from "@tauri-apps/api/core";
import { Effect, Option, String as Str, pipe } from "effect";

const WIDTH = 640;

const QUALITY = 0.8;

const HALF = 2;

const FULL = 1;

const ORIGIN = 0;

const PATIENCE = "5 seconds";

const JPEG = "image/jpeg";

const PREFIX = "data:image/jpeg;base64,";

const ANONYMOUS = "anonymous";

const arrived =
  (event: "loadeddata" | "seeked") =>
  (target: HTMLElement): Effect.Effect<void> =>
    Effect.callback((resume) => {
      const done = (): void => {
        resume(Effect.void);
      };
      target.addEventListener(event, done, { once: true });
      return Effect.sync(() => {
        target.removeEventListener(event, done);
      });
    });

const opened = (location: string): Effect.Effect<HTMLVideoElement> =>
  Effect.sync(() => {
    const video = document.createElement("video");
    video.crossOrigin = ANONYMOUS;
    video.muted = true;
    video.preload = "auto";
    video.src = convertFileSrc(location);
    return video;
  });

type Draw = (context: CanvasRenderingContext2D, width: number, height: number) => void;

const jpegOf =
  (width: number, height: number) =>
  (draw: Draw): Option.Option<string> => {
    if (width <= ORIGIN || height <= ORIGIN) {
      return Option.none();
    }
    const scale = Math.min(WIDTH / width, FULL);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    return pipe(
      Option.fromNullishOr(canvas.getContext("2d")),
      Option.map((context) => {
        draw(context, canvas.width, canvas.height);
        return pipe(canvas.toDataURL(JPEG, QUALITY), Str.replace(PREFIX, ""));
      }),
    );
  };

export const stillOf =
  (range: Range) =>
  ({ media, location }: Opened): Effect.Effect<Option.Option<string>> => {
    if (media.source.site !== "file") {
      return Effect.succeedNone;
    }
    return Effect.acquireUseRelease(
      opened(location),
      (video) =>
        Effect.gen(function* framing() {
          yield* arrived("loadeddata")(video);
          const seeking = arrived("seeked")(video);
          video.currentTime = (range.from + range.to) / HALF;
          yield* seeking;
          return jpegOf(
            video.videoWidth,
            video.videoHeight,
          )((context, width, height) => {
            context.drawImage(video, ORIGIN, ORIGIN, width, height);
          });
        }),
      (video) =>
        Effect.sync(() => {
          video.removeAttribute("src");
          video.load();
        }),
    ).pipe(
      Effect.timeoutOption(PATIENCE),
      Effect.map(Option.flatten),
      Effect.catchCause(() => Effect.succeedNone),
    );
  };
