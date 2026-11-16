import { Array as Arr, Option, pipe } from "effect";

import { barSeconds, songSeconds } from "#/entities/song/index.ts";
import type { NoteEvent } from "#/entities/song/index.ts";
import type { Scroller } from "#/shared/lib/scroller.ts";
import {
  relayout,
  resized,
  rollScaleOf,
  zoomArrange,
  zoomRoll,
} from "#/widgets/daw-view/model/layout.ts";
import { flippedBy, settled, unmixed } from "#/widgets/daw-view/model/model.ts";
import { keyboardWidth } from "#/widgets/daw-view/model/roll-layout.ts";
import { pickAt } from "#/widgets/daw-view/model/roll-pick.ts";
import type { Aim } from "#/widgets/daw-view/model/roll-pick.ts";
import { readTheme } from "#/widgets/daw-view/model/theme.ts";

import {
  buildChips,
  buildHeads,
  paintLegend,
  switchAt,
  syncMixing,
  syncSelection,
} from "./heads.ts";
import type { Shell } from "./shell.ts";

const NONE = 0;
const IN = 1;
const OUT = -1;

const syncChrome = ({ parts, model }: Shell): void => {
  const { selected, session, mixing, theme } = model.read();
  const track = pipe(
    session.tracks,
    Arr.findFirst((item) => Option.contains(selected, item.name)),
  );
  syncSelection(parts.tracks.heads)(selected);
  syncSelection(parts.roll.chips)(selected);
  syncMixing(parts.tracks.heads)({ session, mixing });
  paintLegend(parts.roll.legend)({ track, tint: theme.tint });
};

export const rebuildChrome = (shell: Shell): void => {
  const { session, mixing, theme } = shell.model.read();
  const chrome = { session, mixing, tint: theme.tint };
  buildHeads(shell.parts.tracks.heads)(chrome);
  buildChips(shell.parts.roll.chips)(chrome);
  syncChrome(shell);
};

const select = (shell: Shell, selected: Option.Option<string>): void => {
  shell.model.step((model) => settled({ ...model, selected, hover: Option.none() }));
  syncChrome(shell);
};

export const unmix = (shell: Shell): void => {
  shell.model.step(unmixed);
  rebuildChrome(shell);
  relayout(shell);
};

const press = (shell: Shell): void => {
  shell.transport.press();
  if (shell.transport.playing()) {
    shell.model.step((model) => ({ ...model, follow: true }));
  }
};

const seek = (shell: Shell, seconds: number): void => {
  shell.model.step((model) => ({ ...model, follow: true }));
  shell.transport.seek(seconds);
};

const trackAt = (event: MouseEvent): Option.Option<string> =>
  pipe(
    Option.liftPredicate(event.target, (target): target is Element => target instanceof Element),
    Option.flatMapNullishOr((target) => target.closest<HTMLElement>("button[data-track]")),
    Option.flatMapNullishOr((button) => button.dataset["track"]),
  );

const onHeads =
  (shell: Shell) =>
  (event: MouseEvent): void => {
    const { selected } = shell.model.read();
    const change = switchAt(event);
    const name = trackAt(event);
    if (Option.isSome(change)) {
      shell.model.step(flippedBy(change.value));
      shell.transport.mix(shell.model.read().mixing);
      syncChrome(shell);
    } else if (Option.isSome(name)) {
      select(
        shell,
        pipe(
          name,
          Option.filter((track) => !Option.contains(selected, track)),
        ),
      );
    }
  };

const onChips =
  (shell: Shell) =>
  (event: MouseEvent): void => {
    const name = trackAt(event);
    if (Option.isSome(name)) {
      select(
        shell,
        pipe(
          name,
          Option.filter((track) => track !== ""),
        ),
      );
    }
  };

const onWave =
  (shell: Shell) =>
  (event: MouseEvent): void => {
    const rect = shell.parts.deck.wave.getBoundingClientRect();
    seek(shell, ((event.clientX - rect.left) / rect.width) * songSeconds(shell.structure));
  };

const onLanes =
  (shell: Shell) =>
  (event: MouseEvent): void => {
    const rect = shell.parts.tracks.lanes.getBoundingClientRect();
    const bars = (event.clientX - rect.left) / shell.model.read().scale;
    seek(shell, bars * barSeconds(shell.structure));
  };

const aimOf = (shell: Shell, event: MouseEvent): Option.Option<Aim> => {
  const current = shell.model.read();
  const rect = shell.parts.roll.canvas.getBoundingClientRect();
  const left = event.clientX - rect.left;
  const inside = left - keyboardWidth(current.metrics.roll.width);
  if (inside < NONE) {
    return Option.none();
  }
  const bars = (inside + shell.scrollers.roll.node.scrollLeft) / rollScaleOf(current);
  return Option.some({
    left,
    top: event.clientY - rect.top,
    seconds: bars * barSeconds(shell.structure),
  });
};

const onRoll =
  (shell: Shell) =>
  (event: MouseEvent): void => {
    const aim = aimOf(shell, event);
    if (Option.isSome(aim)) {
      seek(shell, aim.value.seconds);
    }
  };

const hover = (shell: Shell, next: Option.Option<NoteEvent>): void => {
  if (Option.getOrUndefined(shell.model.read().hover) !== Option.getOrUndefined(next)) {
    shell.model.step((model) => ({ ...model, hover: next }));
  }
};

const onPoint =
  (shell: Shell) =>
  (event: PointerEvent): void => {
    if (event.pointerType === "mouse") {
      const pick = pickAt(shell.model.read().layout);
      hover(shell, pipe(aimOf(shell, event), Option.flatMap(pick)));
    }
  };

const onScroll = (shell: Shell, scroller: Scroller) => (): void => {
  const own = scroller.settle();
  if (!own && shell.transport.playing() && performance.now() > shell.model.read().quiet) {
    shell.model.step((model) => ({ ...model, follow: false }));
  }
  shell.loop.kick();
};

const onKey =
  (shell: Shell) =>
  (event: KeyboardEvent): void => {
    const { arrange, roll } = shell.scrollers;
    const targets: readonly (EventTarget | null)[] = [document.body, arrange.node, roll.node];
    if (event.code === "Space" && !event.repeat && targets.includes(event.target)) {
      event.preventDefault();
      press(shell);
    }
  };

const retheme = (shell: Shell): void => {
  shell.model.step((model) => ({ ...model, theme: readTheme(shell.parts.root) }));
  rebuildChrome(shell);
};

const wireTransport = (shell: Shell): void => {
  const { parts } = shell;
  parts.header.play.addEventListener("click", () => {
    press(shell);
  });
  parts.tracks.follow.addEventListener("click", () => {
    shell.model.step((model) => ({ ...model, follow: !model.follow }));
  });
  parts.deck.wave.addEventListener("click", onWave(shell));
  parts.tracks.lanes.addEventListener("click", onLanes(shell));
  parts.roll.canvas.addEventListener("click", onRoll(shell));
  document.addEventListener("keydown", onKey(shell));
};

const wireZoom = (shell: Shell): void => {
  const { tracks, roll } = shell.parts;
  tracks.zoomOut.addEventListener("click", () => {
    zoomArrange(shell)(OUT);
  });
  tracks.zoomIn.addEventListener("click", () => {
    zoomArrange(shell)(IN);
  });
  roll.zoomOut.addEventListener("click", () => {
    zoomRoll(shell)(OUT);
  });
  roll.zoomIn.addEventListener("click", () => {
    zoomRoll(shell)(IN);
  });
};

const wireView = (shell: Shell): void => {
  const { parts, scrollers } = shell;
  const observer = new ResizeObserver(() => {
    resized(shell);
  });
  for (const scroller of [scrollers.arrange, scrollers.roll]) {
    scroller.node.addEventListener("scroll", onScroll(shell, scroller), { passive: true });
    observer.observe(scroller.node);
  }
  parts.tracks.heads.addEventListener("click", onHeads(shell));
  parts.roll.chips.addEventListener("click", onChips(shell));
  parts.roll.canvas.addEventListener("pointermove", onPoint(shell));
  parts.roll.canvas.addEventListener("pointerleave", () => {
    hover(shell, Option.none());
  });
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    retheme(shell);
  });
};

export const wire = (shell: Shell): void => {
  wireTransport(shell);
  wireZoom(shell);
  wireView(shell);
};
