import type { ToolSections } from "@r_masseater/vite-plus-adopt";

declare module "vite" {
  interface UserConfig extends ToolSections {}
}
