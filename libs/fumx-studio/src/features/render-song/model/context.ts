import type { Bus } from "#/shared/lib/studio/bus.ts";
import type { Ledger } from "#/shared/lib/studio/placement.ts";

import type { Samples } from "./desk.ts";
import type { Timing } from "./placements.ts";
import type { Rack } from "./rack.ts";

export interface Session {
  readonly samples: Samples;
  readonly log: Ledger;
  readonly progress: (share: number, label: string) => void;
}

export interface Context extends Rack, Timing {
  readonly session: Session;
  readonly buses: ReadonlyMap<string, Bus>;
}
