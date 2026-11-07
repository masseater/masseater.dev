import { CircleX } from "lucide-react";
import type { ReactNode } from "react";

import type { Phase } from "#/pages/inspect/model/trace";

import { Note } from "./note";

const FailureReason = ({ phase }: Readonly<{ phase: Phase }>): ReactNode => {
  if (phase.status !== "failed") {
    return "";
  }
  return (
    <Note text={phase.reason}>
      <CircleX />
    </Note>
  );
};

export { FailureReason };
