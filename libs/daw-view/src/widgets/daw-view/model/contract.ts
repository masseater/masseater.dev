import type { Structure, Take } from "#/entities/song/index.ts";
import type { Samples } from "#/shared/lib/samples.ts";
import type { Heading } from "#/widgets/daw-view/ui/page.ts";
import type { Credit } from "#/widgets/daw-view/ui/panels.ts";

import type { Mixdown } from "./mix.ts";
import type { Mixer } from "./mixing.ts";
import type { Tape } from "./tape.ts";

export interface Progress {
  readonly share: number;
  readonly label: string;
  readonly take: Take;
}

export interface RenderSession {
  readonly samples: Samples;
  readonly report: (progress: Progress) => void;
}

export interface MixMessage {
  readonly play?: number;
  readonly stop?: true;
  readonly mixers?: readonly Mixer[];
}

export interface MixPlayer {
  readonly msg: (message: MixMessage) => void;
  readonly render: (left: Float32Array, right: Float32Array, frames: number) => number;
}

export interface LiveMix {
  readonly tracks: readonly string[];
  readonly player: string;
  readonly init: unknown;
  readonly transfer: readonly ArrayBuffer[];
  readonly tape?: Tape;
  readonly mixers?: Readonly<Record<string, Mixer>>;
}

export interface Rendered extends Mixdown {
  readonly take: Take;
  readonly live?: LiveMix;
}

export interface Song extends Structure, Heading {
  readonly credits: readonly Credit[];
  readonly samples: Readonly<Record<string, string>>;
  readonly sampleRate: number;
  readonly render: (session: RenderSession) => Promise<Rendered>;
}
