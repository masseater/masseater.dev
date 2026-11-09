import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { TEXT } from "#/pages/ranking/model/labels";
import { metaQuery } from "#/shared/api/data";

import { Note } from "./note";
import { RankingBody } from "./ranking-body";

const MetaState = (): ReactNode => {
  const meta = useQuery(metaQuery);
  if (meta.status === "pending") {
    return <Note text={TEXT.loading} />;
  }
  if (meta.status === "error") {
    return <Note text={TEXT.failed} />;
  }
  return <RankingBody meta={meta.data} />;
};

export { MetaState };
