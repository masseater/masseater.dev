import { Button } from "@masseater.dev/ui/button";
import type { ReactNode } from "react";

import type { RemarkActions } from "#/pages/write/api/remark-actions.ts";

const REPLACE = "置き換える";
const CANCEL = "やめる";

const RewriteChoices = ({ actions }: Readonly<{ actions: RemarkActions }>): ReactNode => {
  const { done, replace, cancel } = actions;
  return (
    <div className="flex gap-1.5">
      <Button disabled={!done} size="sm" onClick={replace}>
        {REPLACE}
      </Button>
      <Button size="sm" variant="outline" onClick={cancel}>
        {CANCEL}
      </Button>
    </div>
  );
};

export { RewriteChoices };
