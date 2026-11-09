import { getRouteApi } from "@tanstack/react-router";
import { useCallback } from "react";
import type { ReactNode } from "react";

import type { RankingSearch } from "#/pages/ranking/model/search";

const route = getRouteApi("/");

const PagerLink = ({
  page,
  enabled,
  text,
}: Readonly<{ page: number; enabled: boolean; text: string }>): ReactNode => {
  const toPage = useCallback(
    (previous: RankingSearch): RankingSearch => ({ ...previous, page }),
    [page],
  );
  if (!enabled) {
    return <span className="text-muted-foreground">{text}</span>;
  }
  return (
    <route.Link to="." search={toPage} className="underline">
      {text}
    </route.Link>
  );
};

export { PagerLink };
