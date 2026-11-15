import { Match } from "effect";
import { Target } from "lucide-react";
import type { ReactNode } from "react";

import { gradeOf } from "#/entities/inspection";
import type { Grade, Phase } from "#/entities/inspection";
import { COPY } from "#/shared/config";

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

export const GradeLine = ({ text, phase }: Readonly<{ text: string; phase: Phase }>): ReactNode => {
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
