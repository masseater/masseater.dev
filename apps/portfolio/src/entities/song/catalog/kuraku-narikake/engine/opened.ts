import { Option } from "effect";

import type { Sheet } from "#/entities/song/model/take.ts";

import { automationOf } from "./automation.ts";
import { editsLogged } from "./cut-ups.ts";
import { kurakuOf } from "./kuraku.ts";
import type { Kuraku, Setup } from "./kuraku.ts";
import { CUES, clipsOf } from "./score.ts";

export interface Opening {
  readonly samples: Setup["samples"];
  readonly table: Setup["table"];
  readonly clips: string;
}

export const openedOn =
  (sheet: Sheet) =>
  ({ samples, table, clips }: Opening): Kuraku => {
    const kuraku = kurakuOf({ samples, table, log: Option.some(sheet.log), clips: clipsOf(clips) });
    editsLogged(kuraku);
    sheet.show({ roots: CUES.roots, auto: automationOf(kuraku) });
    return kuraku;
  };
