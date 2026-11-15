import { Effect } from "effect";

import type { Revision, Yohaku } from "#/shared/api";

const SAVED_AT = 1_794_472_200_000;

const KEPT: readonly Revision[] = [
  { id: "r1", savedAt: SAVED_AT, excerpt: "雨の音で目が覚めた。", characters: 120 },
];

const revisionCalls = (): Pick<
  Yohaku,
  "exportManuscript" | "listRevisions" | "restoreRevision"
> => ({
  exportManuscript: () => Effect.succeed(true),
  listRevisions: () => Effect.succeed(KEPT),
  restoreRevision: () => Effect.void,
});

export { KEPT, revisionCalls };
