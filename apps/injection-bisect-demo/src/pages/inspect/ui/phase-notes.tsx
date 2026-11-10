import type { ReactNode } from "react";

import type { Phase } from "#/pages/inspect/model/trace";

import { FailureReason } from "./failure-reason";
import { UnreadableParts } from "./unreadable-parts";

const PhaseNotes = ({ phase }: Readonly<{ phase: Phase }>): ReactNode => (
  <>
    <FailureReason phase={phase} />
    <UnreadableParts phase={phase} />
  </>
);

export { PhaseNotes };
