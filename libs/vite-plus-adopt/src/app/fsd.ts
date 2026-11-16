import fsd from "@feature-sliced/steiger-plugin";

import type { SteigerConfig } from "#/shared/config/index.ts";

export interface FsdPlugin {
  readonly plugin: SteigerConfig[number];
  readonly configs: { readonly recommended: SteigerConfig };
}

const plugin: FsdPlugin = fsd;

export default plugin;
