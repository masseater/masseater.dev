import type { Mixdown } from "./mix.ts";
import type { Heading } from "./page.ts";
import type { Credit } from "./panels.ts";
import type { Samples } from "./samples.ts";
import type { Structure, Take } from "./song.ts";

export interface Progress {
  readonly share: number;
  readonly label: string;
  readonly take: Take;
}

export interface RenderSession {
  readonly samples: Samples;
  readonly report: (progress: Progress) => void;
}

export interface Rendered extends Mixdown {
  readonly take: Take;
}

export interface Song extends Structure, Heading {
  readonly credits: readonly Credit[];
  readonly samples: Readonly<Record<string, string>>;
  readonly sampleRate: number;
  readonly render: (session: RenderSession) => Promise<Rendered>;
}
