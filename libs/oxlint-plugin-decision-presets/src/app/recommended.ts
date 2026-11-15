import type { DecisionPlugin } from "@r_masseater/oxlint-plugin-decision";

import { recommended } from "#/entities/rule/index.ts";

import { presetPlugin } from "./plugin.ts";

const plugin: DecisionPlugin = presetPlugin(recommended);

export default plugin;
