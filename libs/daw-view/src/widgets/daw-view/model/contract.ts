import type { Structure, Take } from "#/entities/song/index.ts";
import type { Samples } from "#/shared/lib/samples.ts";
import type { Heading } from "#/widgets/daw-view/ui/page.ts";
import type { Credit } from "#/widgets/daw-view/ui/panels.ts";

import type { Mixdown } from "./mix.ts";

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
