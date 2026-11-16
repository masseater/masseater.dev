import { createDecisionPlugin } from "@r_masseater/oxlint-plugin-decision";
import type { DecisionPlugin } from "@r_masseater/oxlint-plugin-decision";

import type { Preset } from "#/entities/rule/index.ts";

const PLUGIN_NAME = "decision-presets";

export const presetPlugin = (rules: Preset): DecisionPlugin =>
  createDecisionPlugin({ name: PLUGIN_NAME, rules });
