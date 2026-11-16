import type { Meta } from "@masseater.dev/nimado";
import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import { generatedAt, TEXT } from "#/entities/ranking/index.ts";
import { RankingControls } from "#/features/filter-ranking/index.ts";

import { RankingResults } from "./ranking-results.tsx";

export const RankingBody = ({ meta }: Readonly<{ meta: typeof Meta.Type }>): ReactNode => {
  const youtube = Arr.isReadonlyArrayNonEmpty(meta.days.youtube);
  return (
    <>
      <RankingControls
        dates={pipe([...meta.days.nico, ...meta.days.youtube], Arr.dedupe)}
        youtube={youtube}
      />
      <RankingResults meta={meta} youtube={youtube} />
      <p className="text-muted-foreground text-right text-xs">
        {`${generatedAt(meta.generatedAt)} ${TEXT.asOf}`}
      </p>
    </>
  );
};
