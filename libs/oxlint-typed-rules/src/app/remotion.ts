import remotion from "@remotion/eslint-plugin";

import { plainRules, upstreamPlugin } from "#/entities/upstream-plugin/index.ts";
import type { UpstreamPlugin } from "#/entities/upstream-plugin/index.ts";

export type ConfigName = "recommended";

const plugin: UpstreamPlugin<ConfigName> = upstreamPlugin("@remotion", remotion, plainRules);

export default plugin;
