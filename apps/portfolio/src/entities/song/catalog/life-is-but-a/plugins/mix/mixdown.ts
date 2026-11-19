import type { Lane } from "@masseater.dev/fumx-studio/daw/view";
import type { Bus } from "@masseater.dev/fumx-studio/studio/bus";

import { automationOf } from "./automation.ts";
import type { Life } from "./context.ts";
import { LEVEL } from "./levels.ts";
import { kept } from "./tone.ts";
import { walled } from "./wall.ts";

export const mixedDown =
  (life: Life) =>
  (main: Bus): Readonly<Record<string, Lane>> => {
    const fx = life.rack.get("FX");
    kept(life)({ name: "FX", level: LEVEL.fx, walled: true })(fx);
    life.studio.mix({ into: main, gain: LEVEL.fx })(fx);
    walled(life)(main);
    const automation = automationOf(life);
    life.studio.mix({ into: main, gain: LEVEL.front })(life.rack.get("FRONT VOICE"));
    return automation;
  };
