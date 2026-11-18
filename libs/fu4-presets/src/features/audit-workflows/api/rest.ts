import type { Schema } from "effect";
import { Effect, Option, Redacted, Record as Rec } from "effect";

import { GitHubError } from "#/features/audit-workflows/model/github.ts";
import type { GitHubEffect } from "#/features/audit-workflows/model/github.ts";

import type { Endpoints } from "./endpoints.ts";
import type { Reply, Transport } from "./transport.ts";

const API_VERSION = "2022-11-28";
const OK_FLOOR = 200;
const OK_CEILING = 300;

export const NOT_FOUND = 404;

export interface Session {
  readonly endpoints: Endpoints;
  readonly token: Redacted.Redacted;
  readonly transport: Transport;
}

export type Decode<Value> = (text: string) => Effect.Effect<Value, Schema.SchemaError>;

const decoder = new TextDecoder();

export const isOk = (reply: Reply): boolean =>
  reply.status >= OK_FLOOR && reply.status < OK_CEILING;

export const unexpected =
  (url: string) =>
  (reply: Reply): GitHubError =>
    GitHubError.make({ message: `GitHub responded with ${reply.status} for ${url}` });

export const apiGet =
  (session: Session) =>
  (path: string, query: Readonly<Record<string, string>>): GitHubEffect<Reply> => {
    const url = new URL(`${session.endpoints.api}${path}`);
    for (const [name, value] of Rec.toEntries(query)) {
      url.searchParams.set(name, value);
    }
    return session.transport({
      method: "GET",
      url: url.href,
      headers: {
        Authorization: `Bearer ${Redacted.value(session.token)}`,
        "X-GitHub-Api-Version": API_VERSION,
        Accept: "application/vnd.github+json",
      },
      body: Option.none(),
    });
  };

export const decoded =
  <Value>(decode: Decode<Value>) =>
  (reply: Reply): GitHubEffect<Value> => {
    if (!isOk(reply)) {
      return Effect.fail(unexpected("the GitHub API")(reply));
    }
    return decode(decoder.decode(reply.bytes)).pipe(
      Effect.mapError((issue) => GitHubError.make({ message: issue.message })),
    );
  };

export const unlessMissing =
  <Value>(read: (reply: Reply) => GitHubEffect<Value>) =>
  (reply: Reply): GitHubEffect<Option.Option<Value>> => {
    if (reply.status === NOT_FOUND) {
      return Effect.succeedNone;
    }
    return Effect.asSome(read(reply));
  };
