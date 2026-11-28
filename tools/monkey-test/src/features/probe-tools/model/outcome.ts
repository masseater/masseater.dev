import {
  INTERNAL_ERROR,
  ProtocolError,
  SdkError,
  SdkErrorCode,
} from "@modelcontextprotocol/client";
import type { CallToolResult } from "@modelcontextprotocol/client";
import { Array as Arr, Match, Option, Predicate, Record as Rec, String as Str, pipe } from "effect";

import { findingOf } from "#/entities/finding/index.ts";
import type { Finding } from "#/entities/finding/index.ts";

export type Outcome =
  | Readonly<{ _tag: "Answered"; isError: boolean; text: string }>
  | Readonly<{ _tag: "Refused"; code: number; message: string }>
  | Readonly<{ _tag: "TimedOut" }>
  | Readonly<{ _tag: "Dropped"; message: string }>
  | Readonly<{ _tag: "Contradicted"; message: string }>
  | Readonly<{ _tag: "Failed"; message: string }>;

export type Call = Readonly<{ host: string; tool: string; label: string; outcome: Outcome }>;

type Verdict = Readonly<{ kind: Finding["kind"]; detail: string }>;

const BY_SDK_CODE: Readonly<Record<string, (message: string) => Outcome>> = {
  [SdkErrorCode.RequestTimeout]: () => ({ _tag: "TimedOut" }),
  [SdkErrorCode.ConnectionClosed]: (message) => ({ _tag: "Dropped", message }),
  [SdkErrorCode.SendFailed]: (message) => ({ _tag: "Dropped", message }),
  [SdkErrorCode.InvalidResult]: (message) => ({ _tag: "Contradicted", message }),
};

const failed = (message: string): Outcome => ({ _tag: "Failed", message });

const ofSdkError = (error: SdkError): Outcome =>
  pipe(
    Rec.get(BY_SDK_CODE, error.code),
    Option.match({
      onNone: () => failed(`${error.code} ${error.message}`),
      onSome: (outcomeOf) => outcomeOf(error.message),
    }),
  );

export const outcomeOfError = (error: unknown): Outcome =>
  Match.value(error).pipe(
    Match.when(
      (found: unknown): found is ProtocolError => ProtocolError.isInstance(found),
      (found): Outcome => ({ _tag: "Refused", code: found.code, message: found.message }),
    ),
    Match.when((found: unknown): found is SdkError => SdkError.isInstance(found), ofSdkError),
    Match.orElse((other) => failed(String(other))),
  );

const textBlock = (block: unknown): Option.Option<string> =>
  pipe(
    Option.liftPredicate(block, Predicate.isObject),
    Option.flatMap((record) => Rec.get(record as Readonly<Record<string, unknown>>, "text")),
    Option.filter(Predicate.isString),
  );

const textOf = (result: CallToolResult): string =>
  pipe(
    result.content,
    Arr.flatMap((block) => Option.toArray(textBlock(block))),
    Arr.join(" "),
  );

export const outcomeOfResult = (result: CallToolResult): Outcome => ({
  _tag: "Answered",
  isError: result.isError === true,
  text: textOf(result),
});

const verdictOf = (outcome: Outcome): Option.Option<Verdict> =>
  Match.value(outcome).pipe(
    Match.tag("Answered", ({ isError, text }) =>
      Option.liftPredicate(
        { kind: "mcp-contract" as const, detail: "an error result carries no message" },
        () => isError && Str.isEmpty(Str.trim(text)),
      ),
    ),
    Match.tag("Refused", ({ code, message }) =>
      Option.liftPredicate(
        { kind: "mcp-server-error" as const, detail: `internal error ${message}` },
        () => code === INTERNAL_ERROR,
      ),
    ),
    Match.tag("TimedOut", () =>
      Option.some({ kind: "mcp-hang" as const, detail: "no answer in time" }),
    ),
    Match.tag("Dropped", ({ message }) =>
      Option.some({ kind: "mcp-crash" as const, detail: message }),
    ),
    Match.tag("Contradicted", ({ message }) =>
      Option.some({ kind: "mcp-contract" as const, detail: message }),
    ),
    Match.tag("Failed", ({ message }) =>
      Option.some({ kind: "mcp-server-error" as const, detail: message }),
    ),
    Match.exhaustive,
  );

export const findingOfCall = (call: Call): Option.Option<Finding> =>
  pipe(
    verdictOf(call.outcome),
    Option.map(({ kind, detail }) =>
      findingOf({ kind, target: `${call.host} ${call.tool}`, detail: `${call.label}: ${detail}` }),
    ),
  );
