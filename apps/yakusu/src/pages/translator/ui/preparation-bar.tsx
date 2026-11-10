import { Button } from "@masseater.dev/ui/button";
import type { ReactNode } from "react";

import { usePreparation } from "#/pages/translator/api/preparation.ts";
import { amountOf } from "#/pages/translator/model/preparation.ts";

const DOWNLOADING = "モデルを取得中";

const RETRY = "再試行";

const PreparationBar = (): ReactNode => {
  const { preparation, retry } = usePreparation();
  if (preparation.status === "downloading") {
    return (
      <div className="flex items-center gap-4 border-b px-6 py-3 text-sm">
        <span>{DOWNLOADING}</span>
        <progress
          aria-label={DOWNLOADING}
          className="[&::-webkit-progress-bar]:bg-muted [&::-webkit-progress-value]:bg-highlight h-1.5 flex-1 appearance-none overflow-hidden rounded-full"
          max={preparation.progress.total}
          value={preparation.progress.received}
        />
        <span className="text-muted-foreground tabular-nums">{amountOf(preparation.progress)}</span>
      </div>
    );
  }
  if (preparation.status === "failed") {
    return (
      <div className="flex items-center gap-4 border-b px-6 py-3 text-sm" role="alert">
        <span className="text-destructive flex-1">{preparation.message}</span>
        <Button size="sm" variant="outline" onClick={retry}>
          {RETRY}
        </Button>
      </div>
    );
  }
  return false;
};

export { PreparationBar };
