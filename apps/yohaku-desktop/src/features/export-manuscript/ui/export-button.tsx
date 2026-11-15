import { Button } from "@masseater.dev/ui/button";
import { Effect } from "effect";
import { FileDown } from "lucide-react";
import { useCallback } from "react";
import type { ReactNode } from "react";

import { useYohaku } from "#/shared/api";

const LABEL = "書き出す";

export const ExportButton = ({ id }: Readonly<{ id: string }>): ReactNode => {
  const yohaku = useYohaku();
  const exportText = useCallback(() => {
    Effect.runFork(yohaku.exportManuscript(id));
  }, [id, yohaku]);
  return (
    <Button aria-label={LABEL} size="icon-sm" title={LABEL} variant="ghost" onClick={exportText}>
      <FileDown aria-hidden="true" />
    </Button>
  );
};
