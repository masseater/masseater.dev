import { useAtomSet } from "@effect/atom-react";
import { Button } from "@masseater.dev/ui/button";
import { FileDown } from "lucide-react";
import { useCallback } from "react";
import type { ReactNode } from "react";

import type { Library, Style } from "#/entities/library/index.ts";
import { exportAtom } from "#/features/export-preset/model/preset.ts";
import { LABELS } from "#/shared/config/index.ts";

export const ExportButton = ({
  library,
  current: style,
}: Readonly<{ library: Library; current: Style }>): ReactNode => {
  const save = useAtomSet(exportAtom);
  const click = useCallback(() => {
    save({ library, style });
  }, [save, library, style]);
  return (
    <Button variant="outline" size="sm" className="justify-self-start" onClick={click}>
      <FileDown aria-hidden />
      {LABELS.exportPreset}
    </Button>
  );
};
