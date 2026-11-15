import type { DecisionPlugin } from "@r_masseater/oxlint-plugin-decision";

import { strict } from "#/entities/rule/index.ts";

import { presetPlugin } from "./plugin.ts";

const plugin: DecisionPlugin = presetPlugin(strict);

export default plugin;
