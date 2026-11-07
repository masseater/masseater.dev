import { Effect, FiberHandle, Match, Ref } from "effect";
import { mapRpp } from "rpp-kit";
import type { Mapped } from "rpp-kit";

import { checkerThread } from "./checker-thread";
import { playground } from "./content";
import { generatedPane, mainPane, scopedEditor } from "./editors";
import { executor } from "./execution";
import type { Report } from "./output";
import { rppPane, songOf } from "./rpp-pane";
import source from "./timmy-intro.rpp?raw";

type Panes = Readonly<{ rpp: HTMLElement; generated: HTMLElement; main: HTMLElement }>;

type Session = Readonly<{ panes: Panes; report: Report }>;

const codeOf = (mapped: Mapped): string =>
  Match.value(mapped).pipe(
    Match.discriminatorsExhaustive("status")({
      ok: ({ code }) => code,
      error: () => "",
    }),
  );

const runPlayground = Effect.fn("runPlayground")(function* runPlayground({
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

export { runPlayground };
export type { Panes };
