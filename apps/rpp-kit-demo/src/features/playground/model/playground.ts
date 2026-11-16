import { Effect, FiberHandle, Match, Ref } from "effect";
import { mapRpp } from "rpp-kit";
import type { Mapped } from "rpp-kit";

import { songSource as source } from "#/entities/song/index.ts";
import { playground } from "#/shared/config/index.ts";

import { checkerThread } from "./checker-thread.ts";
import { generatedPane, mainPane, scopedEditor } from "./editors.ts";
import { executor } from "./execution.ts";
import type { Report } from "./output.ts";
import { rppPane, songOf } from "./rpp-pane.ts";

export type Panes = Readonly<{ rpp: HTMLElement; generated: HTMLElement; main: HTMLElement }>;

export type Session = Readonly<{ panes: Panes; report: Report }>;

const codeOf = (mapped: Mapped): string =>
  Match.value(mapped).pipe(
    Match.discriminatorsExhaustive("status")({
      ok: ({ code }) => code,
      error: () => "",
    }),
  );

export const runPlayground = Effect.fn("runPlayground")(function* runPlayground({
  panes,
  report,
}: Session) {
  const code = codeOf(mapRpp(source));
  const worker = yield* checkerThread(code);
  const song = yield* songOf(source).pipe(Effect.flatMap((json) => Ref.make(json)));
  const fork = yield* FiberHandle.makeRuntime<never>();
  const generated = yield* scopedEditor({
    host: panes.generated,
    doc: code,
    extensions: generatedPane(worker),
  });
  const onChecked = executor({ worker, song, report, fork });
  const main = yield* scopedEditor({
    host: panes.main,
    doc: playground.usage,
    extensions: mainPane({ worker, onChecked }),
  });
  yield* scopedEditor({
    host: panes.rpp,
    doc: source,
    extensions: rppPane({ worker, generated, main, song }),
  });
  return yield* Effect.never;
});
