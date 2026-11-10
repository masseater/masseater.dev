import remotion from "@remotion/eslint-plugin";

import { plainRules, upstreamPlugin } from "./upstream-plugin.ts";
import type { UpstreamPlugin } from "./upstream-plugin.ts";

type ConfigName = "recommended";

const plugin: UpstreamPlugin<ConfigName> = upstreamPlugin("@remotion", remotion, plainRules);

export type { ConfigName };
export default plugin;
