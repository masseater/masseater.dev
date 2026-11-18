import type { Effect as SongEffect } from "@r_masseater/fumx-parser";

export type EffectOf<Kind extends SongEffect["kind"]> = Extract<SongEffect, { kind: Kind }>;
