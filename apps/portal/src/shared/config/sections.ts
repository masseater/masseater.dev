import type { RegisteredRouter } from "@tanstack/react-router";
import {
  CalendarRange,
  FileText,
  History,
  House,
  KeyRound,
  MessagesSquare,
  NotebookPen,
  Presentation,
  Search,
  UserRound,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type PortalPath = Exclude<
  RegisteredRouter["routeTree"]["types"]["fileRouteTypes"]["to"],
  `${string}$${string}`
>;

export type NavItem = Readonly<{ label: string; to: PortalPath }>;

export type NavGroup = Readonly<{ label: string; items: readonly NavItem[] }>;

export const HOME: NavItem = { label: "ホーム", to: "/" };

export const TOP_GROUP: NavGroup = { label: "トップ", items: [HOME] };

export const NAV_GROUPS: readonly NavGroup[] = [
  {
    label: "watashi",
    items: [
      { label: "年表", to: "/timeline" },
      { label: "ライフ記録", to: "/records" },
      { label: "作業メモ", to: "/memos" },
      { label: "週次振り返り", to: "/weeks" },
      { label: "人物像", to: "/profile" },
      { label: "会話履歴", to: "/conversations" },
    ],
  },
  {
    label: "管理",
    items: [
      { label: "お金", to: "/money" },
      { label: "スライド", to: "/slides" },
      { label: "認証情報", to: "/credentials" },
    ],
  },
];

export const NAV_ICONS: Readonly<Record<PortalPath, LucideIcon>> = {
  "/": House,
  "/timeline": History,
  "/records": NotebookPen,
  "/memos": FileText,
  "/weeks": CalendarRange,
  "/profile": UserRound,
  "/conversations": MessagesSquare,
  "/money": Wallet,
  "/slides": Presentation,
  "/credentials": KeyRound,
  "/search": Search,
};
