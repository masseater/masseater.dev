import type {
  Annotations,
  Manuscript,
  Paragraph,
  Reaction,
  Source,
} from "@masseater.dev/yohaku-protocol";

type ManuscriptType = typeof Manuscript.Type;
type ParagraphType = typeof Paragraph.Type;

interface Opened {
  readonly manuscript: ManuscriptType;
  readonly paragraphs: readonly ParagraphType[];
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

interface Mcp {
  readonly url: string;
  readonly token: string;
}

type Yohaku = Readonly<{
  listManuscripts: () => Promise<readonly ManuscriptType[]>;
  createManuscript: () => Promise<ManuscriptType>;
  openManuscript: (id: string) => Promise<Opened>;
  saveParagraphs: (saving: Readonly<{ id: string; paragraphs: readonly ParagraphType[] }>) => Promise<void>;
  setTitle: (titling: Readonly<{ id: string; text: string }>) => Promise<ManuscriptType>;
  getAnnotations: (id: string) => Promise<typeof Annotations.Type>;
  draftFromMemo: (target: Target) => AsyncIterable<string>;
  rewriteRemark: (target: SpanTarget) => AsyncIterable<string>;
  dismissRemark: (target: Target & Readonly<{ rule: string }>) => Promise<void>;
  logReaction: (reaction: typeof Reaction.Type) => Promise<void>;
  listSources: () => Promise<readonly (typeof Source.Type)[]>;
  ingestText: (text: string) => Promise<typeof Source.Type>;
  revertSource: (id: string) => Promise<void>;
  getMcp: () => Promise<Mcp>;
}>;

export type { Mcp, Opened, SpanTarget, Target, Yohaku };
