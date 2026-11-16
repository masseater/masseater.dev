import { SVF } from "#/entities/song/lib/dsp/filter.ts";
import { busOf } from "#/entities/song/lib/studio/bus.ts";
import type { Bus } from "#/entities/song/lib/studio/bus.ts";

import { editorOf } from "./editor.ts";
import type { Editing } from "./editor.ts";
import type { Kuraku } from "./kuraku.ts";
import type { Edit } from "./score-schema.ts";
import { CUES, SECTIONS } from "./score.ts";
import { sweptAll } from "./sweeps.ts";

const ONE = 1;
const FIRST = 0;
const SILENT = 0;
const DRUM_LOW = { kind: SVF.low, resonance: 0.7 } as const;
const DRUM_HIGH = { kind: SVF.high, resonance: 0.8 } as const;
const MUSEUM_LOW = { kind: SVF.low, resonance: 0.7 } as const;

const editedAll = (editing: Editing, edits: readonly Edit[]): void => {
  const edit = editorOf(editing);
  for (const each of edits) {
    edit(each);
  }
};

export const editsLogged = (kuraku: Kuraku): void => {
  const editing = { kuraku, studio: kuraku.editor, bus: busOf(SILENT)({}) };
  editedAll(editing, CUES.drumEdits);
  editedAll(editing, CUES.edits);
};

const drumsCut = (kuraku: Kuraku, bus: Bus): void => {
  editedAll({ kuraku, studio: kuraku.studio, bus }, CUES.drumEdits);
  sweptAll({
    bus,
    sweep: { ...DRUM_LOW, curve: kuraku.curves.drumLowPass },
    spans: SECTIONS.drumLowPass,
  })(kuraku);
  sweptAll({
    bus,
    sweep: { ...DRUM_HIGH, curve: kuraku.curves.drumHighPass },
    spans: SECTIONS.drumHighPass,
  })(kuraku);
};

const mainShaped = (kuraku: Kuraku, bus: Bus): void => {
  const shared = kuraku.shared();
  for (let index = FIRST; index < shared.main.length; index += ONE) {
    const at = shared.start + index;
    bus.left[at] = (bus.left[at] ?? SILENT) * (shared.main[index] ?? SILENT);
    bus.right[at] = (bus.right[at] ?? SILENT) * (shared.main[index] ?? SILENT);
  }
};

export const cutUp =
  ({ bus, drum }: Readonly<{ bus: Bus; drum: boolean }>) =>
  (kuraku: Kuraku): void => {
    if (drum) {
      drumsCut(kuraku, bus);
    }
    editedAll({ kuraku, studio: kuraku.studio, bus }, CUES.edits);
    sweptAll({
      bus,
      sweep: { ...MUSEUM_LOW, curve: kuraku.curves.museumLowPass },
      spans: SECTIONS.museumLowPass,
    })(kuraku);
    mainShaped(kuraku, bus);
  };
