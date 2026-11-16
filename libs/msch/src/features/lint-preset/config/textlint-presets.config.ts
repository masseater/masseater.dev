import presetJa from "@r_masseater/textlint-rule-preset-ja";
import type { ToolSections } from "@r_masseater/vite-plus-adopt";

type TextlintPresets = NonNullable<NonNullable<ToolSections["textlint"]>["presets"]>;

export const textlintPresets: TextlintPresets = { "@r_masseater/preset-ja": presetJa };
