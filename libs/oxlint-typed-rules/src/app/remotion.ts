import remotion from "@remotion/eslint-plugin";

import { plainRules, upstreamPlugin } from "#/entities/upstream-plugin/index.ts";
import type { ConfigNameOf, UpstreamPlugin } from "#/entities/upstream-plugin/index.ts";

type ConfigName = ConfigNameOf<typeof remotion.configs>;

const plugin: UpstreamPlugin<ConfigName> = upstreamPlugin("@remotion", remotion, plainRules);

export default plugin;
