import fsd from "@feature-sliced/steiger-plugin";

import type { SteigerConfig } from "./types.ts";

interface FsdPlugin {
  readonly plugin: SteigerConfig[number];
  readonly configs: { readonly recommended: SteigerConfig };
}

const plugin: FsdPlugin = fsd;

export type { FsdPlugin };
export default plugin;
