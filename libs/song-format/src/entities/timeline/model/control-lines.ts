import { Array as Arr, Option, Record as Rec, pipe } from "effect";

import type { From } from "#/shared/lib/from.ts";

import { cellsText, pitchText, restsOf, semitoneText } from "./cells.ts";
import type { Cell } from "./cells.ts";
import type { TimelineControl } from "./events.ts";
import { endOfSpan } from "./layout.ts";
import type { Span } from "./layout.ts";
import { controllerKeyOf } from "./plan.ts";
import type { PlannedPart } from "./plan.ts";

const NEXT = 1;

const valueText: From<TimelineControl, string> = (control) => {
  if (control.controller.kind === "bend") {
    return semitoneText(control.value);
  }
  return String(control.value);
};

const headOf =
  (planned: PlannedPart): From<TimelineControl, string> =>
  ({ controller }) => {
    if (controller.kind === "pressure") {
      return Option.match(controller.midi, {
        onNone: () => `${planned.name}.pressure`,
        onSome: (midi) => `${planned.name}.pressure ${pitchText(midi)}`,
      });
    }
    return `${planned.name}.${controllerKeyOf({ controller })}`;
  };

const cellsOf =
  (bar: Span): From<readonly TimelineControl[], readonly Cell[]> =>
  (controls) => {
    const lead = pipe(
      Arr.head(controls),
      Option.map((first) => first.tick - bar.start),
      Option.toArray,
      Arr.flatMap(restsOf),
    );
    const steps = pipe(
      controls,
      Arr.map((control, index) => ({
        head: valueText(control),
        attributes: [],
        length:
          pipe(
            Arr.get(controls, index + NEXT),
            Option.match({ onNone: () => endOfSpan(bar), onSome: (next) => next.tick }),
          ) - control.tick,
      })),
    );
    return [...lead, ...steps];
  };

export const controlLinesOf =
  (bar: Span): From<PlannedPart, readonly string[]> =>
  (planned) =>
    pipe(
      planned.controls,
      Arr.filter((control) => control.tick >= bar.start && control.tick < endOfSpan(bar)),
      Arr.groupBy((control: TimelineControl) => controllerKeyOf(control)),
      Rec.values,
      Arr.map((controls) =>
        pipe(
          Arr.head(controls),
          Option.map((first) => `${headOf(planned)(first)}: ${cellsText(cellsOf(bar)(controls))}`),
        ),
      ),
      Arr.getSomes,
    );
