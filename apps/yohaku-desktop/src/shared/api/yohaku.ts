import type {
  Annotations,
  Manuscript,
  Paragraph,
  Reaction,
  Source,
  SyncStatus,
} from "@masseater.dev/yohaku-protocol";
import type { Effect, Stream } from "effect";

interface Failure {
  readonly message: string;
}

interface Opened {
  readonly manuscript: typeof Manuscript.Type;
  readonly paragraphs: readonly (typeof Paragraph.Type)[];
}

interface SpanTarget {
  readonly id: string;
  readonly paragraphId: string;
  readonly from: number;
  readonly to: number;
  readonly rule: string;
}

interface Mcp {
  readonly url: string;
  readonly token: string;
}

type Yohaku = Readonly<{
  listManuscripts: () => Effect.Effect<readonly (typeof Manuscript.Type)[], Failure>;
  createManuscript: () => Effect.Effect<typeof Manuscript.Type, Failure>;
  openManuscript: (id: string) => Effect.Effect<Opened, Failure>;
  saveParagraphs: (
    saving: Readonly<{ id: string; paragraphs: Opened["paragraphs"] }>,
  ) => Effect.Effect<void, Failure>;
  setTitle: (
    titling: Readonly<{ id: string; text: string }>,
  ) => Effect.Effect<typeof Manuscript.Type, Failure>;
  getAnnotations: (id: string) => Effect.Effect<typeof Annotations.Type, Failure>;
  draftFromMemo: (
    target: Readonly<{ id: string; paragraphId: string }>,
  ) => Stream.Stream<string, Failure>;
  rewriteRemark: (target: SpanTarget) => Stream.Stream<string, Failure>;
  dismissRemark: (
    dismissal: Readonly<{ id: string; paragraphId: string; rule: string }>,
  ) => Effect.Effect<void, Failure>;
  logReaction: (reaction: typeof Reaction.Type) => Effect.Effect<void, Failure>;
  listSources: () => Effect.Effect<readonly (typeof Source.Type)[], Failure>;
  ingestText: (text: string) => Effect.Effect<typeof Source.Type, Failure>;
  revertSource: (id: string) => Effect.Effect<void, Failure>;
  getMcp: () => Effect.Effect<Mcp, Failure>;
  syncStatus: () => Effect.Effect<typeof SyncStatus.Type, Failure>;
  beginSyncSignIn: () => Effect.Effect<void, Failure>;
}>;

export type { Failure, Mcp, Opened, SpanTarget, Yohaku };
