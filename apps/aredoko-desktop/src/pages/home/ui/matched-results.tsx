import type { SearchResult } from "@masseater.dev/aredoko-protocol";
import { Array } from "effect";
import type { ReactNode } from "react";

import { Matches } from "./matches.tsx";
import { OtherResults } from "./other-results.tsx";

type Results = readonly (typeof SearchResult.Type)[];

const MatchedResults = ({
  matches,
  others,
}: Readonly<{ matches: Results; others: Results }>): ReactNode => (
  <div className="flex min-h-0 flex-col gap-6 overflow-y-auto">
    <Matches matches={matches} />
    <OtherResults others={others} nothingClose={Array.isReadonlyArrayEmpty(matches)} />
  </div>
);

export { MatchedResults };
