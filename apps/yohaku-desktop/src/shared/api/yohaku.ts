import type {
  Annotations,
  Manuscript,
  Paragraph,
  Reaction,
  Source,
} from "@masseater.dev/yohaku-protocol";
import type { Effect, Stream } from "effect";

type ManuscriptType = typeof Manuscript.Type;
type Paragraphs = readonly (typeof Paragraph.Type)[];

interface Failure {
  readonly message: string;
}

interface Opened {
  readonly manuscript: ManuscriptType;
  readonly paragraphs: Paragraphs;
}

interface Target {
  readonly id: string;
  readonly paragraphId: string;
}

interface SpanTarget extends Target {
  readonly from: number;
  readonly to: number;
  readonly rule: string;
}

interface Dismissal extends Target {
  readonly rule: string;
}

interface Saving {
  readonly id: string;
  readonly paragraphs: Paragraphs;
}

interface Titling {
  readonly id: string;
  readonly text: string;
}

interface Mcp {
  readonly url: string;
  readonly token: string;
}

type Call<Value> = Effect.Effect<Value, Failure>;

type Yohaku = Readonly<{
  listManuscripts: () => Call<readonly ManuscriptType[]>;
  createManuscript: () => Call<ManuscriptType>;
  openManuscript: (id: string) => Call<Opened>;
  saveParagraphs: (saving: Saving) => Call<void>;
  setTitle: (titling: Titling) => Call<ManuscriptType>;
  getAnnotations: (id: string) => Call<typeof Annotations.Type>;
  draftFromMemo: (target: Target) => Stream.Stream<string, Failure>;
  rewriteRemark: (target: SpanTarget) => Stream.Stream<string, Failure>;
  dismissRemark: (dismissal: Dismissal) => Call<void>;
  logReaction: (reaction: typeof Reaction.Type) => Call<void>;
  listSources: () => Call<readonly (typeof Source.Type)[]>;
  ingestText: (text: string) => Call<typeof Source.Type>;
  revertSource: (id: string) => Call<void>;
  getMcp: () => Call<Mcp>;
}>;

export type {
  Dismissal,
  Failure,
  Mcp,
  Opened,
  Paragraphs,
  Saving,
  SpanTarget,
  Target,
  Titling,
  Yohaku,
};
