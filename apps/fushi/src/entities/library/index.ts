export {
  BACH,
  aimsOf,
  countsOf,
  judgmentOf,
  judgmentsIn,
  songsOf,
  withAim,
  withBaseline,
  withJudgment,
  withSongs,
  withStyle,
  withoutJudgment,
  withoutSong,
} from "./model/library.ts";
export type { Aim, Change, Judgment, Library, Song, Style } from "./model/library.ts";
/** @internal */
export { changed, libraryAtom } from "./model/store.ts";
export { useBaselines, useChange, useLibrary } from "./model/store.ts";
