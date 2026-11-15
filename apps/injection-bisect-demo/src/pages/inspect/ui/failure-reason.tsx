import { CircleX } from "lucide-react";
import type { ReactNode } from "react";

import type { Phase } from "#/entities/inspection";

import { Note } from "./note";

export const FailureReason = ({ phase }: Readonly<{ phase: Phase }>): ReactNode => {
  if (phase.status !== "failed") {
    return "";
  }
  return (
    <Note text={phase.reason}>
      <CircleX />
    </Note>
  );
};
