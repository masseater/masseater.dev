import type { Meta } from "@masseater.dev/nimado";
import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import { generatedAt } from "#/pages/ranking/model/format";
import { TEXT } from "#/pages/ranking/model/labels";

import { RankingControls } from "./ranking-controls";
import { RankingResults } from "./ranking-results";

const RankingBody = ({ meta }: Readonly<{ meta: typeof Meta.Type }>): ReactNode => {
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

export { RankingBody };
