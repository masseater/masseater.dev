import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { TEXT, Note } from "#/entities/ranking/index.ts";
import { metaQuery } from "#/shared/api/index.ts";

import { RankingBody } from "./ranking-body.tsx";

export const MetaState = (): ReactNode => {
  const meta = useQuery(metaQuery);
  if (meta.status === "pending") {
    return <Note text={TEXT.loading} />;
  }
  if (meta.status === "error") {
    return <Note text={TEXT.failed} />;
  }
  return <RankingBody meta={meta.data} />;
};
