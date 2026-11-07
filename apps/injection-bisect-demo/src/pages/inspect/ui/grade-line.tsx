import { Match } from "effect";
import { Target } from "lucide-react";
import type { ReactNode } from "react";

import { gradeOf } from "#/pages/inspect/model/answer";
import type { Grade } from "#/pages/inspect/model/answer";
import { COPY } from "#/pages/inspect/model/copy";
import type { Phase } from "#/pages/inspect/model/trace";

import { Note } from "./note";

const textOf = (grade: Grade): string =>
  Match.value(grade).pipe(
    Match.discriminatorsExhaustive("status")({
      unknown: () => "",
      pending: () => "",
      "correct-clean": () => COPY.correctClean,
      "false-alarm": () => COPY.falseAlarm,
      missed: () => COPY.missed,
      found: ({ covered, extra }) =>
        `${COPY.covered} ${covered}%　${COPY.extra} ${extra}${COPY.chars}`,
    }),
  );

const GradeLine = ({ text, phase }: Readonly<{ text: string; phase: Phase }>): ReactNode => {
  const grade = gradeOf({ text, phase });
  if (grade.status === "unknown" || grade.status === "pending") {
    return "";
  }
  return (
    <Note text={`${COPY.answer}　${textOf(grade)}`}>
      <Target />
    </Note>
  );
};

export { GradeLine };
