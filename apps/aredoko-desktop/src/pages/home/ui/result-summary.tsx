import type { SearchResult } from "@masseater.dev/aredoko-protocol";
import type { ReactNode } from "react";

import { originOf } from "#/pages/home/model";
import { fileNameOf } from "#/shared/lib";

import { ResultActions } from "./result-actions.tsx";
import { ResultPreview } from "./result-preview.tsx";

const ResultSummary = ({ result }: Readonly<{ result: typeof SearchResult.Type }>): ReactNode => (
  <>
    <div className="bg-muted flex aspect-square items-center justify-center overflow-hidden rounded-lg border">
      <ResultPreview result={result} />
    </div>
    <h3 className="text-base font-semibold break-all">{fileNameOf(result.pathname)}</h3>
    <p className="text-muted-foreground text-xs break-all">{result.pathname}</p>
    <p className="text-sm">{originOf(result)}</p>
    <ResultActions result={result} />
  </>
);

export { ResultSummary };
