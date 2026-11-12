import { Button } from "@masseater.dev/ui/button";
import type { ReactNode } from "react";

import type { RemarkActions } from "#/pages/write/api/remark-actions.ts";

const REWRITE = "書き直させる";
const KEEP = "残す";

const UnresolvedChoices = ({ actions }: Readonly<{ actions: RemarkActions }>): ReactNode => {
  const { rewrite, keep } = actions;
  return (
    <div className="flex gap-1.5">
      <Button size="sm" variant="outline" onClick={rewrite}>
        {REWRITE}
      </Button>
      <Button size="sm" variant="outline" onClick={keep}>
        {KEEP}
      </Button>
    </div>
  );
};

export { UnresolvedChoices };
