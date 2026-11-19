import type { Option } from "effect";

import type { PartRunner } from "#/shared/lib/plugin/parts.ts";
import type { Plugins, Samples } from "#/shared/lib/plugin/plugin.ts";
import type { Bus } from "#/shared/lib/studio/bus.ts";
import type { Ledger } from "#/shared/lib/studio/placement.ts";

import type { Timing } from "./placements.ts";
import type { Rack } from "./rack.ts";

export interface Session {
  readonly samples: Samples;
  readonly plugins: Plugins;
  readonly log: Ledger;
  readonly progress: (share: number, label: string) => void;
  readonly parts: Option.Option<PartRunner>;
}

export interface Context extends Rack, Timing {
  readonly session: Session;
  readonly buses: ReadonlyMap<string, Bus>;
}
