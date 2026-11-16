import type { DecisionPlugin } from "@r_masseater/oxlint-plugin-decision";

import { presetPlugin } from "./preset-plugin.ts";
import { strict } from "#/entities/rule/index.ts";

const plugin: DecisionPlugin = presetPlugin(strict);

export default plugin;
