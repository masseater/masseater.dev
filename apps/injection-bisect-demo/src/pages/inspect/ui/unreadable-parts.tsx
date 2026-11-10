import type { Unreadable } from "@r_masseater/injection-bisect";
import { Array as Arr, pipe } from "effect";
import { FileX } from "lucide-react";
import type { ReactNode } from "react";

import type { Phase } from "#/pages/inspect/model/trace";

import { Note } from "./note";

const lineOf = ({ name, reason }: Unreadable): string => `${name}　${reason}`;

const UnreadableParts = ({ phase }: Readonly<{ phase: Phase }>): ReactNode => {
  if (phase.status !== "done") {
    return "";
  }
  return pipe(
    phase.detection.unreadable ?? [],
    Arr.map((part) => lineOf(part)),
    Arr.dedupe,
    Arr.map((line) => (
      <Note key={line} text={line}>
        <FileX />
      </Note>
    )),
  );
};

export { UnreadableParts };
