import type { SearchResult } from "@masseater.dev/aredoko-protocol";
import { Array } from "effect";
import type { ReactNode } from "react";

import { useOthersShown } from "#/pages/home/model";

import { ResultGrid } from "./result-grid.tsx";
import { ShowOthersButton } from "./show-others-button.tsx";

const OTHERS = "ほかの候補";

type Results = readonly (typeof SearchResult.Type)[];

const OtherResults = ({
  others,
  nothingClose,
}: Readonly<{ others: Results; nothingClose: boolean }>): ReactNode => {
  const shown = useOthersShown();
  if (Array.isReadonlyArrayEmpty(others)) {
    return false;
  }
  if (!shown) {
    return <ShowOthersButton nothingClose={nothingClose} />;
  }
  return (
    <section className="flex flex-col gap-3 opacity-80">
      {!nothingClose && <h2 className="text-muted-foreground text-sm">{OTHERS}</h2>}
      <ResultGrid results={others} />
    </section>
  );
};

export { OtherResults };
