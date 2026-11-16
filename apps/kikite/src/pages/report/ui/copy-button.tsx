import { Button } from "@masseater.dev/ui/button";
import { Copy } from "lucide-react";
import type { ReactNode } from "react";

import { useCopyHandoff } from "#/pages/report/model/review-hooks.ts";

const LABEL = "Markdown をコピー";

export const CopyButton = (): ReactNode => {
  const onClick = useCopyHandoff();
  return (
    <Button variant="ghost" size="icon-sm" aria-label={LABEL} title={LABEL} onClick={onClick}>
      <Copy />
    </Button>
  );
};
