import type { Source } from "@masseater.dev/shirushi-protocol";
import { Effect, MutableRef } from "effect";
import type { Scope } from "effect";

import { STILL } from "#/shared/lib/player";
import type { Mount, Player } from "#/shared/lib/player";
import { pageOf } from "#/shared/lib/source";

type Progress = Readonly<{ currentPosition: number }>;

type Widget = Readonly<{
  bind: (event: string, listener: (progress: Progress) => void) => void;
  getDuration: (callback: (milliseconds: number) => void) => void;
  seekTo: (milliseconds: number) => void;
  toggle: () => void;
}>;

type WidgetApi = Readonly<{
  Widget: ((element: HTMLElement) => Widget) &
    Readonly<{ Events: Readonly<{ READY: string; PLAY_PROGRESS: string }> }>;
}>;

declare global {
  const SC: WidgetApi;
}

const MILLISECONDS = 1000;

const widgetUrl = (source: Source): string =>
  `https://w.soundcloud.com/player/?${new URLSearchParams({
    url: pageOf(source),
    visual: "true",
    auto_play: "false",
    show_comments: "false",
  }).toString()}`;

const framed = ({ stage, source }: Mount): Effect.Effect<HTMLIFrameElement> =>
  Effect.sync(() => {
    const iframe = document.createElement("iframe");
    iframe.src = widgetUrl(source);
    iframe.allow = "autoplay";
    iframe.title = "SoundCloud";
    stage.replaceChildren(iframe);
    return iframe;
  });

const cleared = ({ stage }: Mount): Effect.Effect<void> =>
  Effect.sync(() => {
    stage.replaceChildren();
  });

const ready = ({ frame }: Readonly<{ frame: HTMLElement }>): Effect.Effect<Player> =>
  Effect.callback((resume) => {
    const widget = SC.Widget(frame);
    const position = MutableRef.make(STILL);
    widget.bind(SC.Widget.Events.PLAY_PROGRESS, ({ currentPosition }) => {
      MutableRef.update(position, (now) => ({ ...now, current: currentPosition / MILLISECONDS }));
    });
    widget.bind(SC.Widget.Events.READY, () => {
      widget.getDuration((milliseconds) => {
        MutableRef.update(position, (now) => ({ ...now, duration: milliseconds / MILLISECONDS }));
        resume(
          Effect.succeed({
            time: () => MutableRef.get(position),
            seek: (seconds: number) => {
              widget.seekTo(seconds * MILLISECONDS);
              MutableRef.update(position, (now) => ({ ...now, current: seconds }));
            },
            toggle: () => {
              widget.toggle();
            },
          }),
        );
      });
    });
  });

export const mountSoundcloud = (mount: Mount): Effect.Effect<Player, never, Scope.Scope> =>
  Effect.acquireRelease(framed(mount), () => cleared(mount)).pipe(
    Effect.flatMap((frame) => ready({ frame })),
  );
