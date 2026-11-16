export { useManuscripts } from "./api/manuscripts.ts";
export { ManuscriptRow } from "./ui/manuscript-row.tsx";
export { received, dropped, annotationsField, noteLines, kindAt } from "./model/annotations.ts";
export type { Texts, Marked, Kind } from "./model/annotations.ts";
export {
  editorAtom,
  manuscriptIdAtom,
  pausedAtom,
  titleAtom,
  draftRequestAtom,
  keptAtom,
  stalledAtom,
  rewritingAtom,
  NO_TITLE,
  openedParagraphsAtom,
  placedAtom,
  paragraphsAtom,
} from "./model/writing-atoms.ts";
export type { DraftRequest } from "./model/writing-atoms.ts";
export { draftClosed, draftOf, draftSet, draftActions, draftsField } from "./model/memo-draft.ts";
export type { DraftActions } from "./model/memo-draft.ts";
export {
  lineOf,
  initialIds,
  paragraphIdsField,
  paragraphsOf,
  textOf,
} from "./model/paragraph-ids.ts";
export { memoAtCursor } from "./model/memo-at-cursor.ts";
export { remarkLayout, remarkLayoutPlugin } from "./model/remark-layout.ts";
export type { Placed } from "./model/remark-layout.ts";
