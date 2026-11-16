import { Cause, Effect, Option, pipe } from "effect";

import type { Take } from "#/entities/song/index.ts";
import { sessionOf } from "#/entities/song/index.ts";
import { loadSamples } from "#/shared/lib/samples.ts";
import type { Progress, Rendered, Song } from "#/widgets/daw-view/model/contract.ts";
import { relayout } from "#/widgets/daw-view/model/layout.ts";
import { peaksOf, shadesOf } from "#/widgets/daw-view/model/mix.ts";
import { mixingOf } from "#/widgets/daw-view/model/mixing.ts";
import type { Mixer } from "#/widgets/daw-view/model/mixing.ts";
import { mixedWith, settled } from "#/widgets/daw-view/model/model.ts";

import { rebuildChrome } from "./controls.ts";
import type { Shell } from "./shell.ts";

const SAMPLE_SHARE = 0.15;
const FULL = 1;
const FIRST_PAINT = "80 millis";

export interface Production<Failure, Requirements> {
  readonly shell: Shell;
  readonly song: Song;
  readonly fetched: (url: string) => Effect.Effect<ArrayBuffer, Failure, Requirements>;
}

const loading = (shell: Shell, label: string, share: number): void => {
  shell.model.step((model) => ({ ...model, phase: { status: "loading", label, share } }));
};

const show = (shell: Shell, take: Take): void => {
  shell.model.step((model) =>
    settled({
      ...model,
      session: sessionOf(shell.structure)(take),
      shades: shadesOf(shell.structure)(take.automation),
    }),
  );
  rebuildChrome(shell);
};

const report =
  (shell: Shell) =>
  ({ share, label, take }: Progress): void => {
    show(shell, take);
    loading(shell, label, SAMPLE_SHARE + share * (FULL - SAMPLE_SHARE));
    relayout(shell);
    shell.loop.paint();
  };

const finish = (shell: Shell, song: Song, rendered: Rendered): void => {
  const peaks = peaksOf(shell.parts.deck.wave.width)(rendered);
  const seconds = rendered.left.length / song.sampleRate;
  const mixed = shell.transport.load(rendered, Option.fromUndefinedOr(rendered.live));
  const mixers = pipe(
    Option.fromUndefinedOr(rendered.live),
    Option.flatMapNullishOr(({ mixers: given }) => given),
    Option.getOrElse((): Readonly<Record<string, Mixer>> => ({})),
  );
  shell.model.step(mixedWith(mixingOf(mixers)(mixed)));
  shell.transport.mix(shell.model.read().mixing);
  show(shell, rendered.take);
  shell.model.step((model) => ({ ...model, peaks, phase: { status: "ready", seconds } }));
  relayout(shell);
};

const messageOf = (cause: Cause.Cause<unknown>): string => {
  const error = Cause.squash(cause);
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
};

const fail =
  (shell: Shell) =>
  (cause: Cause.Cause<unknown>): Effect.Effect<void> =>
    Effect.sync(() => {
      const message = messageOf(cause);
      shell.model.step((model) => ({ ...model, phase: { status: "failed", message } }));
    });

const rendered = Effect.fn("song.rendered")(function* rendered<Failure, Requirements>(
  production: Production<Failure, Requirements>,
) {
  const { shell, song, fetched } = production;
  yield* Effect.sleep(FIRST_PAINT);
  const samples = yield* loadSamples({
    urls: song.samples,
    sampleRate: song.sampleRate,
    fetched,
    onProgress: (share) => {
      loading(shell, "samples", share * SAMPLE_SHARE);
    },
  });
  const result = yield* Effect.promise(() => song.render({ samples, report: report(shell) }));
  finish(shell, song, result);
});

export const produce = <Failure, Requirements>(
  production: Production<Failure, Requirements>,
): Effect.Effect<void, never, Requirements> =>
  rendered(production).pipe(Effect.catchCause(fail(production.shell)));
