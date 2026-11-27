import { Ledger } from "@masseater.dev/exposure-protocol";
import type { LedgerEntryValue, Report } from "@masseater.dev/exposure-protocol";
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

import type { Claims } from "#/entities/credential/index.ts";
import { queueRequest, readRow, swapRow } from "#/shared/api/index.ts";
import type { QueuedEnv } from "#/shared/api/index.ts";

const LEDGER_KEY = "exposure_ledger";
const REPORTED_KEY = "exposure_reported";
const SENDER = "exposure-check";
const RENOTIFY_AFTER = Duration.toMillis(Duration.fromInputUnsafe("1 day"));
const MAX_FINDINGS = 200;
const MAX_TEXT_LENGTH = 500;
const PRINTABLE_LINE = /^[\p{L}\p{M}\p{N}\p{P}\p{S} ]+$/u;

const InstructionText = Schema.String.check(
  Schema.isMaxLength(MAX_TEXT_LENGTH),
  Schema.isPattern(PRINTABLE_LINE),
);

const BoundedReport = Schema.Struct({
  findings: Schema.Array(
    Schema.Struct({ fingerprint: InstructionText, line: InstructionText }),
  ).check(Schema.isMaxLength(MAX_FINDINGS)),
});

const Reported = Schema.Record(Schema.String, Schema.Finite);

type Row<Codec extends Schema.Codec<unknown, string>> = Readonly<{
  env: QueuedEnv;
  name: string;
  codec: Codec;
  empty: Codec["Type"];
}>;

export type Notice = Readonly<{
  env: QueuedEnv;
  claims: typeof Claims.Type;
  report: typeof Report.Type;
}>;

export const LedgerJson = Schema.fromJsonString(Ledger);
export const ReportJson = Schema.fromJsonString(BoundedReport);
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

export const remember = ({
  env,
  observed,
}: Readonly<{
  env: QueuedEnv;
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
  queueRequest({ env: notice.env, request: { text: message(notice), sender: SENDER } });

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

export const notify = (notice: Notice): Effect.Effect<Response> =>
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
