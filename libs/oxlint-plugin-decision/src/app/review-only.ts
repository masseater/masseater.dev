import type { DecisionPlugin } from "@r_masseater/oxlint-plugin-decision";

import { reviewOnly } from "#/features/define-presets/index.ts";

import { presetPlugin } from "./preset-plugin.ts";

const plugin: DecisionPlugin = presetPlugin(reviewOnly);

export default plugin;
