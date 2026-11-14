import { Button } from "@masseater.dev/ui/button";
import { Download } from "lucide-react";
import type { ReactNode } from "react";

import { useSave } from "#/pages/interview/model/review-hooks";

const LABEL = "JSON を書き出す";

const SaveButton = (): ReactNode => {
  const onClick = useSave();
  return (
    <Button variant="ghost" size="icon-sm" aria-label={LABEL} title={LABEL} onClick={onClick}>
      <Download />
    </Button>
  );
};

export { SaveButton };
