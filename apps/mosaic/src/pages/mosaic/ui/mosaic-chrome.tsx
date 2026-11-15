import type { ReactNode } from "react";

import { MosaicSwitcher } from "#/features/switch-mosaic/index.ts";

import { MosaicToolbar } from "./mosaic-toolbar";

export const MosaicChrome = ({
  slug,
  seed,
}: Readonly<{ slug: string; seed: number }>): ReactNode => (
  <>
    <MosaicToolbar slug={slug} seed={seed} />
    <MosaicSwitcher slug={slug} />
  </>
);
