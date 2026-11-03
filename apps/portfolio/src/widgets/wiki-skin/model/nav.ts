import { site } from "#/shared/config";

const NAV_LABEL = "Sloppedia の案内";

const navItems = [
  { to: "/sloppedia", label: "メインページ" },
  { to: "/sloppedia/categories", label: "カテゴリ一覧" },
  { to: "/", label: site.name },
] as const;

type NavItem = (typeof navItems)[number];

export type { NavItem };
export { NAV_LABEL, navItems };
