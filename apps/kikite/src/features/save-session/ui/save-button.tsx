import { Button } from "@masseater.dev/ui/button";
import { Download } from "lucide-react";
import type { ReactNode } from "react";

import { useSave } from "#/features/save-session/model/save";

const LABEL = "JSON を書き出す";

export const SaveButton = (): ReactNode => {
  const onClick = useSave();
  return (
    <Button variant="ghost" size="icon-sm" aria-label={LABEL} title={LABEL} onClick={onClick}>
      <Download />
    </Button>
  );
};
