import { CircleX } from "lucide-react";
import type { ReactNode } from "react";

import type { Phase } from "#/entities/inspection/index.ts";

import { Note } from "./note.tsx";

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
