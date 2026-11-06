const PAGES = ["satsuei-lab", "split-pad", "pod-rattle"] as const;

const ASSETS_DIR = "labs-assets";

const PAGE_SCRIPT_SOURCES: Readonly<Record<string, readonly string[]>> = {
  "pod-rattle": ["blob:"],
};

export { ASSETS_DIR, PAGES, PAGE_SCRIPT_SOURCES };
