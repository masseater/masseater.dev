import { Channel } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";
import { Effect, Queue, Stream } from "effect";

import { commands } from "./generated/bindings.ts";
import type { Failure as CommandFailure } from "./generated/bindings.ts";
import type { Failure, Yohaku } from "./yohaku.ts";

const UNREACHABLE = "余白に問い合わせられません";
const NOT_OPENED = "ブラウザーを開けません";

type Settled<Value> =
  | Readonly<{ status: "ok"; data: Value }>
  | Readonly<{ status: "error"; error: CommandFailure }>;

const unreachable = (): Failure => ({ message: UNREACHABLE });

const call = <Value>(run: () => Promise<Settled<Value>>): Effect.Effect<Value, Failure> =>
  Effect.tryPromise({ try: run, catch: unreachable }).pipe(
    Effect.flatMap((answer) => {
      if (answer.status === "ok") {
        return Effect.succeed(answer.data);
      }
      return Effect.fail({ message: answer.error.message });
    }),
  );

const streamed = (
  run: (onText: (text: string) => void) => Promise<Settled<null>>,
): Stream.Stream<string, Failure> =>
  Stream.callback<string, Failure>((queue) =>
    call(() =>
      run((text) => {
        Queue.offerUnsafe(queue, text);
      }),
    ).pipe(Effect.andThen(Queue.end(queue))),
  );

const opened = (url: string): Effect.Effect<void, Failure> =>
  Effect.tryPromise({ try: () => openUrl(url), catch: () => ({ message: NOT_OPENED }) });

const tauriYohaku: Yohaku = {
  listManuscripts: () => call(() => commands.listManuscripts()),
  createManuscript: () => call(() => commands.createManuscript()),
  openManuscript: (id) => call(() => commands.openManuscript(id)),
  saveParagraphs: ({ id, paragraphs }) =>
    call(() => commands.saveParagraphs(id, [...paragraphs])).pipe(Effect.asVoid),
  setTitle: ({ id, text }) => call(() => commands.setTitle(id, text)),
  getAnnotations: (id) => call(() => commands.getAnnotations(id)),
  draftFromMemo: ({ id, paragraphId }) =>
    streamed((onText) => commands.draftFromMemo(id, paragraphId, new Channel(onText))),
  rewriteRemark: ({ id, paragraphId, from, to, rule }) =>
    streamed((onText) =>
      commands.rewriteRemark(id, paragraphId, from, to, rule, new Channel(onText)),
    ),
  dismissRemark: ({ id, paragraphId, rule }) =>
    call(() => commands.dismissRemark(id, paragraphId, rule)).pipe(Effect.asVoid),
  logReaction: (reaction) => call(() => commands.logReaction(reaction)).pipe(Effect.asVoid),
  listSources: () => call(() => commands.listSources()),
  ingestText: (text) => call(() => commands.ingestText(text)),
  revertSource: (id) => call(() => commands.revertSource(id)).pipe(Effect.asVoid),
  getMcp: () => call(() => commands.getMcp()),
  syncStatus: () => call(() => commands.syncStatus()),
  beginSyncSignIn: () =>
    call(() => commands.beginSyncSignIn()).pipe(Effect.flatMap(({ url }) => opened(url))),
};

export { tauriYohaku };
