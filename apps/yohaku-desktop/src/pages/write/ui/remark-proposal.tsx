import { Option, pipe } from "effect";
import type { ReactNode } from "react";

import type { RemarkActions } from "#/pages/write/api/remark-actions.ts";

const RemarkProposal = ({ actions }: Readonly<{ actions: RemarkActions }>): ReactNode =>
  pipe(
    actions.proposal,
    Option.filter(() => actions.rewriting),
    Option.match({
      onNone: () => false,
      onSome: (text) => <p className="text-draft font-serif text-sm leading-7">{text}</p>,
    }),
  );

export { RemarkProposal };
