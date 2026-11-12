import type { ReactNode } from "react";

import type { RemarkActions } from "#/pages/write/api/remark-actions.ts";

import { RewriteChoices } from "./rewrite-choices.tsx";
import { UnresolvedChoices } from "./unresolved-choices.tsx";

const RemarkChoices = ({ actions }: Readonly<{ actions: RemarkActions }>): ReactNode => {
  if (actions.rewriting) {
    return <RewriteChoices actions={actions} />;
  }
  return <UnresolvedChoices actions={actions} />;
};

export { RemarkChoices };
