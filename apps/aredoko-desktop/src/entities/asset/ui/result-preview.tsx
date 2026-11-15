import type { SearchResult } from "@masseater.dev/aredoko-protocol";
import { FileQuestion } from "lucide-react";
import type { ReactNode } from "react";

import { LoadedPreview } from "./loaded-preview.tsx";

const ResultPreview = ({ result }: Readonly<{ result: typeof SearchResult.Type }>): ReactNode => {
  if (!result.hasPreview) {
    return <FileQuestion className="text-muted-foreground size-8" />;
  }
  return <LoadedPreview result={result} />;
};

export { ResultPreview };
