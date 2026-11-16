export const PAGES = [
  "satsuei-lab",
  "split-pad",
  "pod-rattle",
  "nikogori/okitara-saiteita",
  "nikogori/hikari-no-henji",
  "nikogori/mada-atatakai",
  "nikogori/mada-atatakai-v2",
  "ai-produced/life-is-but-a",
  "ai-produced/kuraku-narikake",
] as const;

export const ASSETS_DIR = "labs-assets";

export const PAGE_SCRIPT_SOURCES: Readonly<Record<string, readonly string[]>> = {
  "pod-rattle": ["blob:"],
  "ai-produced": ["blob:"],
};
