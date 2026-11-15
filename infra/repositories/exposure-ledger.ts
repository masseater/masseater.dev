import { Ledger, Report } from "@masseater.dev/exposure-protocol";
import type { LedgerEntryValue } from "@masseater.dev/exposure-protocol";
import type { ClaudeRequest } from "@masseater.dev/exposure-protocol/claude-requests";
import {
  Array as Arr,
  Boolean as Bool,
  Clock,
  Duration,
  Effect,
  Option,
  Order,
  Record as Rec,
  Schema,
  pipe,
} from "effect";

import { readRow, swapRow } from "./app-store.ts";
import type { AppStoreEnv } from "./app-store.ts";
import type { Claims } from "./github-oidc.ts";

const LEDGER_KEY = "exposure_ledger";
const REPORTED_KEY = "exposure_reported";
const SENDER = "exposure-check";
const RENOTIFY_AFTER = Duration.toMillis(Duration.fromInputUnsafe("1 day"));

const Reported = Schema.Record(Schema.String, Schema.Finite);

type ClaudeRequests = Readonly<{ send: (request: ClaudeRequest) => Promise<unknown> }>;

type ExposureEnv = AppStoreEnv & Readonly<{ CLAUDE_REQUESTS: ClaudeRequests }>;

type Row<Codec extends Schema.Codec<unknown, string>> = Readonly<{
  env: ExposureEnv;
  name: string;
  codec: Codec;
  empty: Codec["Type"];
}>;

type Notice = Readonly<{
  env: ExposureEnv;
  claims: typeof Claims.Type;
  report: typeof Report.Type;
}>;

const taggedError = Schema.TaggedError;

class QueueRefused extends taggedError<QueueRefused, { readonly brand: unique symbol }>()(
  "QueueRefused",
  { reason: Schema.String },
) {}

const LedgerJson = Schema.fromJsonString(Ledger);
const ReportJson = Schema.fromJsonString(Report);
const ReportedJson = Schema.fromJsonString(Reported);

const stored = <Codec extends Schema.Codec<unknown, string>>({
  env,
  name,
  codec,
  empty,
}: Row<Codec>): Effect.Effect<Readonly<{ raw: Option.Option<string>; value: Codec["Type"] }>> =>
  readRow({ env, name }).pipe(
    Effect.flatMap((raw) =>
      Option.match(raw, {
        onNone: () => Effect.succeed({ raw, value: empty }),
        onSome: (text) =>
          Schema.decodeEffect(codec)(text).pipe(
            Effect.orDie,
            Effect.map((value) => ({ raw, value })),
          ),
      }),
    ),
  );

const replace = <Codec extends Schema.Codec<unknown, string>>(
  row: Row<Codec> & Readonly<{ update: (current: Codec["Type"]) => Codec["Type"] }>,
): Effect.Effect<Codec["Type"]> =>
  Effect.gen(function* replaceRow() {
    const current = yield* stored(row);
    const next = row.update(current.value);
    const value = yield* Schema.encodeEffect(row.codec)(next).pipe(Effect.orDie);
    const swapped = yield* swapRow({ env: row.env, name: row.name, expected: current.raw, value });
    return { swapped, next };
  }).pipe(
    Effect.repeat({ until: ({ swapped }) => swapped }),
    Effect.map(({ next }) => next),
  );

const entryKey = (entry: LedgerEntryValue): string => `${entry.kind}:${entry.key}`;

const merged = (
  current: readonly LedgerEntryValue[],
  observed: readonly LedgerEntryValue[],
): readonly LedgerEntryValue[] =>
  pipe(
    [...current, ...observed],
    Arr.dedupeWith((left, right) => entryKey(left) === entryKey(right)),
    Arr.sortWith(entryKey, Order.String),
  );

const remember = ({
  env,
  observed,
}: Readonly<{
  env: ExposureEnv;
  observed: readonly LedgerEntryValue[];
}>): Effect.Effect<Response> =>
  replace({
    env,
    name: LEDGER_KEY,
    codec: LedgerJson,
    empty: { entries: [] },
    update: (current) => ({ entries: merged(current.entries, observed) }),
  }).pipe(Effect.map((ledger) => Response.json(ledger)));

const runUrl = (claims: typeof Claims.Type): string =>
  `https://github.com/${claims.repository}/actions/runs/${claims.run_id}`;

const message = ({ claims, report }: Notice): string =>
  Arr.join(
    [
      "masseater.dev の exposure ワークフローが、外から見えてはいけないものが見える状態を見つけた。",
      ...pipe(
        report.findings,
        Arr.map((found) => `- ${found.line}`),
      ),
      "原因を直し、持ち主にはプロジェクトチャットで一行で知らせる。誤検知なら tools/exposure-check の判定を直す。",
      `実行: ${runUrl(claims)}`,
    ],
    "\n",
  );

const isFresh =
  (reported: typeof Reported.Type, now: number) =>
  (fingerprint: string): boolean =>
    pipe(
      Rec.get(reported, fingerprint),
      Option.match({ onNone: () => true, onSome: (at) => now - at >= RENOTIFY_AFTER }),
    );

const send = (notice: Notice): Effect.Effect<void> =>
  Effect.tryPromise({
    try: () => notice.env.CLAUDE_REQUESTS.send({ text: message(notice), sender: SENDER }),
    catch: (cause) => QueueRefused.make({ reason: String(cause) }),
  }).pipe(Effect.orDie, Effect.asVoid);

const stamped =
  (fingerprints: readonly string[], notified: boolean, now: number) =>
  (previous: typeof Reported.Type): typeof Reported.Type =>
    Rec.fromEntries(
      pipe(
        fingerprints,
        Arr.map((fingerprint) => [
          fingerprint,
          Bool.match(notified, {
            onFalse: () => Option.getOrElse(Rec.get(previous, fingerprint), () => now),
            onTrue: () => now,
          }),
        ]),
      ),
    );

const notify = (notice: Notice): Effect.Effect<Response> =>
  Effect.gen(function* notifyClaude() {
    const now = yield* Clock.currentTimeMillis;
    const current = yield* stored({
      env: notice.env,
      name: REPORTED_KEY,
      codec: ReportedJson,
      empty: {},
    });
    const fingerprints = pipe(
      notice.report.findings,
      Arr.map((found) => found.fingerprint),
    );
    const notified = pipe(fingerprints, Arr.some(isFresh(current.value, now)));
    yield* Effect.when(send(notice), Effect.succeed(notified));
    yield* replace({
      env: notice.env,
      name: REPORTED_KEY,
      codec: ReportedJson,
      empty: {},
      update: stamped(fingerprints, notified, now),
    });
    yield* Effect.logInfo("exposure.reported").pipe(
      Effect.annotateLogs({ findings: fingerprints.length, notified }),
    );
    return Response.json({ notified });
  });

export { LedgerJson, ReportJson, notify, remember };
export type { ClaudeRequests, ExposureEnv, Notice };
