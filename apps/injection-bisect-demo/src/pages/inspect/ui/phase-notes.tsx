import type { ReactNode } from "react";

import type { Phase } from "#/entities/inspection/index.ts";

import { FailureReason } from "./failure-reason.tsx";
import { UnreadableParts } from "./unreadable-parts.tsx";

export const PhaseNotes = ({ phase }: Readonly<{ phase: Phase }>): ReactNode => (
  <>
    <FailureReason phase={phase} />
    <UnreadableParts phase={phase} />
  </>
);
