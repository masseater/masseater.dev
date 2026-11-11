import { Clock, Duration, Effect } from "effect";

import { askingAtom, heardAtom, interimAtom, listeningAtom, settingsAtom } from "./atoms.ts";
import type { Asking, Heard, Listening, Settings } from "./atoms.ts";
import { read } from "./registry.ts";

type Snapshot = Readonly<{
  now: number;
  heard: Heard;
  settings: Settings;
  interim: string;
  listening: Listening;
  asking: Asking;
}>;

type Due = Readonly<{ ask: boolean; summarize: boolean }>;

const MANUAL = 0;

const elapsed = (now: number, since: number, seconds: number): boolean =>
  Duration.isGreaterThanOrEqualTo(Duration.millis(now - since), Duration.seconds(seconds));

const quiet = ({ interim, listening, asking }: Snapshot): boolean =>
  interim === "" && listening.status !== "muted" && asking.status === "idle";

const answered = ({ heard, settings }: Snapshot): boolean =>
  settings.silenceSeconds > MANUAL && heard.spokeSinceQuestion;

const dueAt = (snapshot: Snapshot): Due => ({
  ask:
    answered(snapshot) &&
    quiet(snapshot) &&
    elapsed(snapshot.now, snapshot.heard.lastSpeechAt, snapshot.settings.silenceSeconds),
  summarize: elapsed(snapshot.now, snapshot.heard.lastSummaryAt, snapshot.settings.summarySeconds),
});

const due = Effect.gen(function* due() {
  const snapshot: Snapshot = {
    now: yield* Clock.currentTimeMillis,
    heard: yield* read(heardAtom),
    settings: yield* read(settingsAtom),
    interim: yield* read(interimAtom),
    listening: yield* read(listeningAtom),
    asking: yield* read(askingAtom),
  };
  return dueAt(snapshot);
});

/** @internal */
export { due, dueAt };
