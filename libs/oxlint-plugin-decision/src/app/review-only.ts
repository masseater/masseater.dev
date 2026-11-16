import type { DecisionPlugin } from "@r_masseater/oxlint-plugin-decision";

import { presetPlugin } from "./preset-plugin.ts";
import { reviewOnly } from "#/entities/rule/index.ts";

const plugin: DecisionPlugin = presetPlugin(reviewOnly);

export default plugin;
