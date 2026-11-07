import type { SearchResult } from "@masseater.dev/aredoko-protocol";
import { Array, pipe } from "effect";
import type { ReactNode } from "react";

import { ResultTile } from "./result-tile.tsx";

const ResultGrid = ({
  results,
}: Readonly<{ results: readonly (typeof SearchResult.Type)[] }>): ReactNode => (
  <ul className="grid grid-cols-3 gap-4 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
    {pipe(
      results,
      Array.map((result) => <ResultTile key={result.assetId} result={result} />),
    )}
  </ul>
);

export { ResultGrid };
