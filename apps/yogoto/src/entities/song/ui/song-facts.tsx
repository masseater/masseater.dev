import type { Song } from "@masseater.dev/yogoto-protocol";
import { Option } from "effect";
import type { ReactNode } from "react";

import { factsOf } from "#/entities/song/model/facts.ts";
import type { Facts } from "#/entities/song/model/facts.ts";
import { LABELS } from "#/shared/config/index.ts";

import { FactChip } from "./fact-chip.tsx";

const nothing = (): ReactNode => false;

const chips = ({ bpm, key, meter }: Facts): ReactNode => (
  <div className="flex gap-2">
    <FactChip text={`${LABELS.bpm} ${bpm}`} />
    <FactChip text={`${LABELS.key} ${key}`} />
    <FactChip text={meter} />
  </div>
);

export const SongFacts = ({ song }: Readonly<{ song: Song }>): ReactNode =>
  Option.match(factsOf(song), { onNone: nothing, onSome: chips });
