import type { DecisionPlugin } from "@r_masseater/oxlint-plugin-decision";

import { presetPlugin } from "./preset-plugin.ts";
import { recommended } from "#/entities/rule/index.ts";

const plugin: DecisionPlugin = presetPlugin(recommended);

export default plugin;
