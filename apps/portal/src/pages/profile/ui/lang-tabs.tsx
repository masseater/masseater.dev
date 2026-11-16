import { getRouteApi, Link } from "@tanstack/react-router";
import { Struct } from "effect";
import { useMemo } from "react";
import type { ReactNode } from "react";

const route = getRouteApi("/profile");

const TEXT = { english: "English", japanese: "日本語", label: "言語" } as const;

const TAB =
  "text-muted-foreground hover:text-foreground aria-[current=page]:border-foreground aria-[current=page]:text-foreground -mb-px border-b-4 border-transparent pb-2 text-sm font-bold";

const LANG = ["lang"] as const;

export const LangTabs = (): ReactNode => {
  const search = route.useSearch();
  const english = useMemo(() => Struct.omit(search, LANG), [search]);
  const japanese = useMemo(() => ({ ...search, lang: "ja" as const }), [search]);
  return (
    <nav aria-label={TEXT.label} className="flex gap-6">
      <Link
        aria-current={search.lang !== "ja" && "page"}
        className={TAB}
        search={english}
        to="/profile"
      >
        {TEXT.english}
      </Link>
      <Link
        aria-current={search.lang === "ja" && "page"}
        className={TAB}
        search={japanese}
        to="/profile"
      >
        {TEXT.japanese}
      </Link>
    </nav>
  );
};
