import type {
  Annotations,
  Fact,
  Manuscript,
  Paragraph,
  ParagraphKind,
  Reaction,
  Source,
  SyncStatus,
} from "@masseater.dev/yohaku-protocol";
import { Array, Effect, Option, Record, Stream, String, pipe } from "effect";

import type { ClaudeStatus, OnboardingStep, Yohaku } from "#/shared/api";

type ManuscriptType = typeof Manuscript.Type;
type Paragraphs = readonly (typeof Paragraph.Type)[];
type SourceType = typeof Source.Type;

const MEMO_SPACE = "　";
const IDEA = "ネタ：";
const EMOTION = "胸の奥がじんわりと温かくなった。";
const DRAFT = ["彩葉の声に、", "かぐやの顔のまま振り向いてしまった。"] as const;
const REWRITE = ["胸に手を当てて、", "鏡から目をそらした。"] as const;
const NEVER = 0;
const SYNCED_AT = 1_794_472_200_000;
const SIGNED_OUT: typeof SyncStatus.Type = {
  connected: false,
  syncedAt: Option.getOrNull(Option.none<number>()),
  pending: NEVER,
  problem: Option.getOrNull(Option.none<string>()),
};
const NO_TITLE = Option.getOrNull(Option.none<ManuscriptType["title"]>());
const NO_WHEN = Option.getOrNull(Option.none<string>());
const INGESTED: readonly (typeof Fact.Type)[] = [
  { kind: "character", subject: "ヤチヨ", body: "8000 年後のかぐや", when: NO_WHEN },
  { kind: "setting", subject: "ツクヨミ", body: "ヤチヨが管理する仮想空間", when: NO_WHEN },
];
const ALL_STEPS: readonly OnboardingStep[] = ["setup", "idea-hint", "source-hint"];
const READY: ClaudeStatus = { installed: true, loggedIn: true };

type Setup = Partial<Pick<Store, "claude" | "onboarding">>;

interface Calls {
  readonly reactions: (typeof Reaction.Type)[];
  readonly dismissed: string[];
  readonly saved: Paragraphs[];
  readonly opened: string[];
}

interface Store {
  readonly manuscripts: Readonly<Record<string, ManuscriptType>>;
  readonly paragraphs: Readonly<Record<string, Paragraphs>>;
  readonly sources: readonly SourceType[];
  readonly sync: typeof SyncStatus.Type;
  readonly onboarding: readonly OnboardingStep[];
  readonly claude: ClaudeStatus;
}

interface Backing {
  readonly read: () => Store;
  readonly write: (update: (store: Store) => Store) => void;
  readonly save: (paragraphs: Paragraphs) => void;
  readonly dismiss: (rule: string) => void;
  readonly react: (reaction: typeof Reaction.Type) => void;
  readonly open: (url: string) => void;
}

const kindOf = (text: string): typeof ParagraphKind.Type => {
  if (String.startsWith(IDEA)(text)) {
    return "idea";
  }
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
  facts: INGESTED.length,
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
}: Backing): Pick<
  Yohaku,
  "getMcp" | "ingestText" | "listSources" | "revertSource" | "sourceFacts"
> => ({
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
  getMcp: () => Effect.succeed({ url: "http://127.0.0.1:47210/mcp", token: "token" }),
  sourceFacts: () => Effect.succeed(INGESTED),
});

const onboardingCalls = ({
  read,
  write,
  open,
}: Backing): Pick<
  Yohaku,
  "claudeStatus" | "completeOnboardingStep" | "onboardingDone" | "openExternal"
> => ({
  claudeStatus: () => Effect.sync(() => read().claude),
  onboardingDone: () => Effect.sync(() => read().onboarding),
  completeOnboardingStep: (step) =>
    Effect.sync(() => {
      write((store) => ({ ...store, onboarding: pipe(store.onboarding, Array.append(step)) }));
    }),
  openExternal: (url) =>
    Effect.sync(() => {
      open(url);
    }),
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

type Fake = Readonly<{ yohaku: Yohaku; calls: Readonly<Calls> }>;

const built = (sources: readonly (typeof Source.Type)[], setup: Setup): Fake => {
  const calls: Calls = { reactions: [], dismissed: [], saved: [], opened: [] };
  let store: Store = {
    manuscripts: Record.empty(),
    paragraphs: Record.empty(),
    sources,
    sync: SIGNED_OUT,
    onboarding: setup.onboarding ?? ALL_STEPS,
    claude: setup.claude ?? READY,
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
    open: (url) => {
      calls.opened.push(url);
    },
  };
  return {
    calls,
    yohaku: {
      ...manuscriptCalls(backing),
      ...sourceCalls(backing),
      ...syncCalls(backing),
      ...writingCalls(backing),
      ...onboardingCalls(backing),
    },
  };
};

const fakeYohaku = (sources: readonly (typeof Source.Type)[]): Fake => built(sources, {});

const firstRun = (claude: ClaudeStatus): Fake => built([], { onboarding: [], claude });

const ideaHintPending = (): Fake => built([], { onboarding: ["setup", "source-hint"] });

export { DRAFT, EMOTION, IDEA, READY, REWRITE, fakeYohaku, firstRun, ideaHintPending };
export type { Calls, Fake, Paragraphs };
