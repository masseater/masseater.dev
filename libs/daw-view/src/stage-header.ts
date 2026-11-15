import { Array as Arr, Option, pipe } from "effect";

import type { Shell } from "./shell.ts";
import { barSeconds } from "./song.ts";
import type { Structure } from "./song.ts";
import { mark, say } from "./stage-text.ts";
import { barBeat, clock } from "./text.ts";

const PERCENT = 100;
const SHARE_DECIMALS = 1;
const JUST_BEFORE = 1e-6;

const sectionAt = (structure: Structure, time: number): string =>
  pipe(
    structure.marks,
    Arr.findLast((item) => item.bar <= time / barSeconds(structure)),
    Option.match({ onNone: () => "", onSome: (item) => item.label }),
  );

const labelOf = ({ structure, model }: Shell, time: number): string => {
  const { phase } = model.read();
  if (phase.status === "loading") {
    return phase.label;
  }
  if (phase.status === "failed") {
    return `error: ${phase.message}`;
  }
  return sectionAt(structure, time);
};

const stateOf = (active: boolean): Readonly<{ state: string; label: string }> => {
  if (active) {
    return { state: "playing", label: "一時停止" };
  }
  return { state: "paused", label: "再生" };
};

const paintPlay = ({ parts, transport, model }: Shell): void => {
  const { play } = parts.header;
  const waiting = transport.waiting() && model.read().phase.status === "loading";
  const { state, label } = stateOf(transport.playing() || waiting);
  mark(play)("data-state", state);
  mark(play)("aria-label", label);
  mark(play)("data-waiting", String(waiting));
  mark(parts.tracks.follow)("aria-pressed", String(model.read().follow));
};

const paintProgress = ({ parts, model }: Shell): void => {
  const { phase } = model.read();
  const { header } = parts;
  mark(header.progress)("data-done", String(phase.status === "ready"));
  if (phase.status === "loading") {
    header.progressFill.style.width = `${(phase.share * PERCENT).toFixed(SHARE_DECIMALS)}%`;
  }
  if (phase.status === "ready") {
    say(header.total)(clock(phase.seconds));
  }
};

export const paintHeader =
  (shell: Shell) =>
  (time: number): void => {
    const { header } = shell.parts;
    const end = shell.structure.bars * barSeconds(shell.structure) - JUST_BEFORE;
    say(header.clock)(clock(time));
    say(header.position)(barBeat(shell.structure)(Math.min(time, end)));
    say(header.section)(labelOf(shell, time));
    paintPlay(shell);
    paintProgress(shell);
  };
