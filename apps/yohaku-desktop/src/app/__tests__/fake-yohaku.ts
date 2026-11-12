import type {
  Annotations,
  Manuscript,
  Paragraph,
  Reaction,
  Source,
} from "@masseater.dev/yohaku-protocol";
import { Array, Option, String, pipe } from "effect";

import type { Yohaku } from "#/shared/api";

const MEMO_SPACE = "　";
const EMOTION = "胸の奥がじんわりと温かくなった。";
const DRAFT = ["彩葉の声に、", "かぐやの顔のまま振り向いてしまった。"] as const;
const REWRITE = ["胸に手を当てて、", "鏡から目をそらした。"] as const;
const MCP_URL = "http://127.0.0.1:47210/mcp";
const MCP_TOKEN = "token";

interface Calls {
  readonly reactions: (typeof Reaction.Type)[];
  readonly dismissed: string[];
  readonly saved: (readonly (typeof Paragraph.Type)[])[];
}

interface FakeYohaku {
  readonly yohaku: Yohaku;
  readonly calls: Calls;
}

async function* chunks(parts: readonly string[]): AsyncGenerator<string> {
  yield* parts;
}

const annotationsOf = (paragraphs: readonly (typeof Paragraph.Type)[]): typeof Annotations.Type => ({
  title: null,
  kinds: pipe(
    paragraphs,
    Array.filter(({ text }) => String.isNonEmpty(text)),
    Array.map(({ id, text }) => ({
      paragraphId: id,
      kind: String.includes(MEMO_SPACE)(text) ? "memo" : "prose",
    })),
  ),
  remarks: pipe(
    paragraphs,
    Array.map(({ id, text }) =>
      pipe(
        Option.fromNullishOr(text.indexOf(EMOTION) >= 0 ? text.indexOf(EMOTION) : undefined),
        Option.map((from) => ({
          paragraphId: id,
          from,
          to: from + EMOTION.length,
          rule: "emotion_explained",
          message: "感情の説明",
        })),
      ),
    ),
    Array.getSomes,
  ),
});

const fakeYohaku = (sources: readonly (typeof Source.Type)[] = []): FakeYohaku => {
  const calls: Calls = { reactions: [], dismissed: [], saved: [] };
  const manuscripts = new Map<string, typeof Manuscript.Type>();
  const stored = new Map<string, readonly (typeof Paragraph.Type)[]>();
  const listed = [...sources];
  const yohaku: Yohaku = {
    listManuscripts: async () => [...manuscripts.values()],
    createManuscript: async () => {
      const manuscript = { id: `m${manuscripts.size}`, title: null, excerpt: "", updatedAt: 0 };
      manuscripts.set(manuscript.id, manuscript);
      return manuscript;
    },
    openManuscript: async (id) => ({
      manuscript: manuscripts.get(id) ?? { id, title: null, excerpt: "", updatedAt: 0 },
      paragraphs: stored.get(id) ?? [],
    }),
    saveParagraphs: async ({ id, paragraphs }) => {
      calls.saved.push(paragraphs);
      stored.set(id, paragraphs);
    },
    setTitle: async ({ id, text }) => {
      const manuscript = { id, title: { text, by: "writer" as const }, excerpt: "", updatedAt: 0 };
      manuscripts.set(id, manuscript);
      return manuscript;
    },
    getAnnotations: async (id) => annotationsOf(stored.get(id) ?? []),
    draftFromMemo: () => chunks(DRAFT),
    rewriteRemark: () => chunks(REWRITE),
    dismissRemark: async ({ rule }) => {
      calls.dismissed.push(rule);
    },
    logReaction: async (reaction) => {
      calls.reactions.push(reaction);
    },
    listSources: async () => [...listed],
    ingestText: async (text) => {
      const source = {
        id: `s${listed.length}`,
        label: text,
        origin: "agent" as const,
        client: "余白",
        facts: 2,
        createdAt: 0,
      };
      listed.unshift(source);
      return source;
    },
    revertSource: async (id) => {
      listed.splice(listed.findIndex((source) => source.id === id), 1);
    },
    getMcp: async () => ({ url: MCP_URL, token: MCP_TOKEN }),
  };
  return { yohaku, calls };
};

export { DRAFT, EMOTION, REWRITE, fakeYohaku };
export type { FakeYohaku };
