import type { DecisionPlugin } from "@r_masseater/oxlint-plugin-decision";

import { reviewOnly } from "#/entities/rule/index.ts";

import { presetPlugin } from "./plugin.ts";

const plugin: DecisionPlugin = presetPlugin(reviewOnly);

export default plugin;
