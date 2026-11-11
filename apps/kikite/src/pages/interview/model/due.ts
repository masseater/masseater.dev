import { Array as Arr, Clock, Duration, Effect, Option, pipe } from "effect";

import {
  answerDraftAtom,
  askingAtom,
  entriesAtom,
  heardAtom,
  hearingAtom,
  interimAtom,
  listeningAtom,
} from "./atoms.ts";
import type { Asking, Entry, Heard, Listening } from "./atoms.ts";
import { read } from "./registry.ts";

type Snapshot = Readonly<{
  now: number;
  heard: Heard;
  entries: readonly Entry[];
  interim: string;
  typing: string;
  hearing: boolean;
  listening: Listening;
  asking: Asking;
}>;

type Due = Readonly<{ ask: boolean; summarize: boolean; nudge: number; stale: boolean }>;

const SILENCE_SECONDS = 2.5;
const SUMMARY_SECONDS = 20;
const STALE_SECONDS = 15;
const FIRST_NUDGE_SECONDS = 10;
const SECOND_NUDGE_SECONDS = 30;
const NUDGE_SECONDS = [SECOND_NUDGE_SECONDS, FIRST_NUDGE_SECONDS] as const;
const NO_NUDGE = 0;

const elapsed = (now: number, since: number, seconds: number): boolean =>
  Duration.isGreaterThanOrEqualTo(Duration.millis(now - since), Duration.seconds(seconds));

const quiet = ({ interim, typing, listening, asking }: Snapshot): boolean =>
  interim === "" &&
  typing === "" &&
  listening.status !== "speaking" &&
  asking.status !== "drafting";

const spoke = (entries: readonly Entry[]): boolean =>
  pipe(
    entries,
    Arr.some((entry) => entry.kind === "speech"),
  );

const nudgeLevel = (snapshot: Snapshot): number => {
  if (spoke(snapshot.entries) || !quiet(snapshot)) {
    return NO_NUDGE;
  }
  return pipe(
    NUDGE_SECONDS,
    Arr.findFirstIndex((seconds) => elapsed(snapshot.now, snapshot.heard.lastActivityAt, seconds)),
    Option.match({
      onNone: () => NO_NUDGE,
      onSome: (index) => NUDGE_SECONDS.length - index,
    }),
  );
};

const unanswered = ({ heard, interim, typing, hearing }: Snapshot): boolean =>
  !heard.spokeSinceQuestion && interim === "" && typing === "" && !hearing;

const staleAt = (snapshot: Snapshot): boolean =>
  pipe(
    Arr.last(snapshot.entries),
    Option.filter((entry) => entry.kind === "question"),
    Option.exists(
      (entry) => unanswered(snapshot) && elapsed(snapshot.now, entry.at, STALE_SECONDS),
    ),
  );

const dueAt = (snapshot: Snapshot): Due => ({
  ask:
    snapshot.heard.spokeSinceQuestion &&
    quiet(snapshot) &&
    elapsed(snapshot.now, snapshot.heard.lastActivityAt, SILENCE_SECONDS),
  summarize: elapsed(snapshot.now, snapshot.heard.lastSummaryAt, SUMMARY_SECONDS),
  nudge: nudgeLevel(snapshot),
  stale: staleAt(snapshot),
});

const due = Effect.gen(function* due() {
  const snapshot: Snapshot = {
    now: yield* Clock.currentTimeMillis,
    heard: yield* read(heardAtom),
    entries: yield* read(entriesAtom),
    interim: yield* read(interimAtom),
    typing: yield* read(answerDraftAtom),
    hearing: yield* read(hearingAtom),
    listening: yield* read(listeningAtom),
    asking: yield* read(askingAtom),
  };
  return dueAt(snapshot);
});

/** @internal */
export { due, dueAt };
export type { Due };
