import type { Effect as SongEffect } from "@r_masseater/song-format";

export type EffectOf<Kind extends SongEffect["kind"]> = Extract<SongEffect, { kind: Kind }>;
