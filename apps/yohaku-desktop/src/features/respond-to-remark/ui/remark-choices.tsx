import type { ReactNode } from "react";

import type { RemarkActions } from "#/features/respond-to-remark/api/remark-actions";

import { RewriteChoices } from "./rewrite-choices.tsx";
import { UnresolvedChoices } from "./unresolved-choices.tsx";

export const RemarkChoices = ({ actions }: Readonly<{ actions: RemarkActions }>): ReactNode => {
  if (actions.rewriting) {
    return <RewriteChoices actions={actions} />;
  }
  return <UnresolvedChoices actions={actions} />;
};
