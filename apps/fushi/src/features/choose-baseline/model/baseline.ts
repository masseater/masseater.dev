import { BACH } from "#/entities/library/index.ts";
import { LABELS } from "#/shared/config/index.ts";

export const baselineName = (name: string): string => {
  if (name === BACH) {
    return LABELS.bach;
  }
  return `${LABELS.chordonomicon} ${name}`;
};
