import type { ReactNode } from "react";

import { PICTURE_ASPECTS, SOUND_ASPECTS } from "#/shared/config/index.ts";

import { AspectGroup } from "./aspect-group.tsx";

export const AspectChips = (): ReactNode => (
  <div className="grid gap-1.5">
    <AspectGroup label="音" aspects={SOUND_ASPECTS} />
    <AspectGroup label="絵" aspects={PICTURE_ASPECTS} />
  </div>
);
