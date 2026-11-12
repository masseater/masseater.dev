import type {
  Annotations,
  Manuscript,
  Paragraph,
  Reaction,
  Source,
  SyncStatus,
} from "@masseater.dev/yohaku-protocol";
import { Array, Effect, Option, Record, Stream, String, pipe } from "effect";

import type { Yohaku } from "#/shared/api";

type ManuscriptType = typeof Manuscript.Type;
type Paragraphs = readonly (typeof Paragraph.Type)[];
type SourceType = typeof Source.Type;

const MEMO_SPACE = "　";
const EMOTION = "胸の奥がじんわりと温かくなった。";
const DRAFT = ["彩葉の声に、", "かぐやの顔のまま振り向いてしまった。"] as const;
const REWRITE = ["胸に手を当てて、", "鏡から目をそらした。"] as const;
const MCP_URL = "http://127.0.0.1:47210/mcp";
const MCP_TOKEN = "token";
const NEVER = 0;
const INGESTED_FACTS = 2;
const SYNCED_AT = 1_794_472_200_000;
const SIGNED_OUT: typeof SyncStatus.Type = {
  connected: false,
  syncedAt: Option.getOrNull(Option.none<number>()),
  pending: NEVER,
  problem: Option.getOrNull(Option.none<string>()),
};
const NO_TITLE = Option.getOrNull(Option.none<ManuscriptType["title"]>());

interface Calls {
  readonly reactions: (typeof Reaction.Type)[];
  readonly dismissed: string[];
  readonly saved: Paragraphs[];
}

interface Store {
  readonly manuscripts: Readonly<Record<string, ManuscriptType>>;
  readonly paragraphs: Readonly<Record<string, Paragraphs>>;
  readonly sources: readonly SourceType[];
  readonly sync: typeof SyncStatus.Type;
}

interface Backing {
  readonly read: () => Store;
  readonly write: (update: (store: Store) => Store) => void;
  readonly save: (paragraphs: Paragraphs) => void;
  readonly dismiss: (rule: string) => void;
  readonly react: (reaction: typeof Reaction.Type) => void;
}

const kindOf = (text: string): "memo" | "prose" => {
  if (String.includes(MEMO_SPACE)(text)) {
    return "memo";
  }
  return "prose";
};

const remarkIn = ({
  id,
  text,
}: typeof Paragraph.Type): Option.Option<(typeof Annotations.Type)["remarks"][number]> =>
  pipe(
    String.indexOf(EMOTION)(text),
    Option.map((from) => ({
      paragraphId: id,
      from,
      to: from + EMOTION.length,
      rule: "emotion_explained",
      message: "感情の説明",
    })),
  );

const annotationsOf = (paragraphs: Paragraphs): typeof Annotations.Type => ({
  title: NO_TITLE,
  kinds: pipe(
    paragraphs,
    Array.filter(({ text }) => String.isNonEmpty(text)),
    Array.map(({ id, text }) => ({ paragraphId: id, kind: kindOf(text) })),
  ),
  remarks: pipe(paragraphs, Array.map(remarkIn), Array.getSomes),
});

const blankManuscript = (id: string): ManuscriptType => ({
  id,
  title: NO_TITLE,
  excerpt: String.empty,
  updatedAt: NEVER,
});

const manuscriptIn = (store: Readonly<Store>, id: string): ManuscriptType =>
  pipe(
    Option.fromUndefinedOr(store.manuscripts[id]),
    Option.getOrElse(() => blankManuscript(id)),
  );

const paragraphsIn = (store: Readonly<Store>, id: string): Paragraphs =>
  pipe(
    Option.fromUndefinedOr(store.paragraphs[id]),
    Option.getOrElse((): Paragraphs => []),
  );

const ingestedSource = (store: Readonly<Store>, text: string): SourceType => ({
  id: `s${store.sources.length.toString()}`,
  label: text,
  origin: "agent",
  client: "余白",
  facts: INGESTED_FACTS,
  createdAt: NEVER,
});

const withManuscript = (store: Store, manuscript: ManuscriptType): Store => ({
  ...store,
  manuscripts: Record.set(store.manuscripts, manuscript.id, manuscript),
});

const manuscriptCalls = ({
  read,
  write,
  save,
}: Backing): Pick<
  Yohaku,
  "createManuscript" | "listManuscripts" | "openManuscript" | "saveParagraphs" | "setTitle"
> => ({
  listManuscripts: () => Effect.sync(() => Record.values(read().manuscripts)),
  createManuscript: () =>
    Effect.sync(() => {
      const manuscript = blankManuscript(`m${Record.size(read().manuscripts).toString()}`);
      write((store) => withManuscript(store, manuscript));
      return manuscript;
    }),
  openManuscript: (id) =>
    Effect.sync(() => ({
      manuscript: manuscriptIn(read(), id),
      paragraphs: paragraphsIn(read(), id),
    })),
  saveParagraphs: ({ id, paragraphs }) =>
    Effect.sync(() => {
      save(paragraphs);
      write((store) => ({ ...store, paragraphs: Record.set(store.paragraphs, id, paragraphs) }));
    }),
  setTitle: ({ id, text }) =>
    Effect.sync(() => {
      const manuscript = { ...blankManuscript(id), title: { text, by: "writer" as const } };
      write((store) => withManuscript(store, manuscript));
      return manuscript;
    }),
});

const sourceCalls = ({
  read,
  write,
}: Backing): Pick<Yohaku, "getMcp" | "ingestText" | "listSources" | "revertSource"> => ({
  listSources: () => Effect.sync(() => read().sources),
  ingestText: (text) =>
    Effect.sync(() => {
      const source = ingestedSource(read(), text);
      write((store) => ({ ...store, sources: pipe(store.sources, Array.prepend(source)) }));
      return source;
    }),
  revertSource: (id) =>
    Effect.sync(() => {
      write((store) => ({
        ...store,
        sources: pipe(
          store.sources,
          Array.filter((source) => source.id !== id),
        ),
      }));
    }),
  getMcp: () => Effect.succeed({ url: MCP_URL, token: MCP_TOKEN }),
});

const syncCalls = ({ read, write }: Backing): Pick<Yohaku, "beginSyncSignIn" | "syncStatus"> => ({
  syncStatus: () => Effect.sync(() => read().sync),
  beginSyncSignIn: () =>
    Effect.sync(() => {
      write((store) => ({
        ...store,
        sync: { ...store.sync, connected: true, syncedAt: SYNCED_AT },
      }));
    }),
});

const writingCalls = ({
  read,
  dismiss,
  react,
}: Backing): Pick<
  Yohaku,
  "dismissRemark" | "draftFromMemo" | "getAnnotations" | "logReaction" | "rewriteRemark"
> => ({
  getAnnotations: (id) => Effect.sync(() => annotationsOf(paragraphsIn(read(), id))),
  draftFromMemo: () => Stream.fromIterable(DRAFT),
  rewriteRemark: () => Stream.fromIterable(REWRITE),
  dismissRemark: ({ rule }) =>
    Effect.sync(() => {
      dismiss(rule);
    }),
  logReaction: (reaction) =>
    Effect.sync(() => {
      react(reaction);
    }),
});

const fakeYohaku = (
  sources: readonly (typeof Source.Type)[],
): Readonly<{
  yohaku: Yohaku;
  calls: Readonly<{
    reactions: (typeof Reaction.Type)[];
    dismissed: string[];
    saved: (readonly (typeof Paragraph.Type)[])[];
  }>;
}> => {
  const calls: Calls = { reactions: [], dismissed: [], saved: [] };
  let store: Store = {
    manuscripts: Record.empty(),
    paragraphs: Record.empty(),
    sources,
    sync: SIGNED_OUT,
  };
  const backing: Backing = {
    read: () => store,
    write: (update) => {
      store = update(store);
    },
    save: (paragraphs) => {
      calls.saved.push(paragraphs);
    },
    dismiss: (rule) => {
      calls.dismissed.push(rule);
    },
    react: (reaction) => {
      calls.reactions.push(reaction);
    },
  };
  return {
    calls,
    yohaku: {
      ...manuscriptCalls(backing),
      ...sourceCalls(backing),
      ...syncCalls(backing),
      ...writingCalls(backing),
    },
  };
};

export { DRAFT, EMOTION, REWRITE, fakeYohaku };
