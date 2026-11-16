import presetJa from "@r_masseater/textlint-rule-preset-ja";
import type { ToolSections } from "@r_masseater/vite-plus-adopt";

export const textlintPresets: NonNullable<NonNullable<ToolSections["textlint"]>["presets"]> = {
  "@r_masseater/preset-ja": presetJa,
};
