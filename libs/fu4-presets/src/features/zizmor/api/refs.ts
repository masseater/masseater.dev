import { Array as Arr, Effect, Option, Redacted, Result, String as Str, pipe } from "effect";

import { GitHubError } from "#/features/zizmor/model/github.ts";
import type { GitHubEffect, NamedRef, RepoRefs } from "#/features/zizmor/model/github.ts";
import { lsRefsRequest, parseLsRefs } from "#/shared/git-protocol/index.ts";
import type { RemoteRef } from "#/shared/git-protocol/index.ts";

import { NOT_FOUND, isOk, unexpected } from "./rest.ts";
import type { Session } from "./rest.ts";
import { AGENT } from "./transport.ts";
import type { Reply } from "./transport.ts";

const HEADS = "refs/heads/";
const TAGS = "refs/tags/";
const PEELED = "^{}";
const START = 0;
const REQUEST = lsRefsRequest(AGENT);

const basic = (token: Redacted.Redacted): string =>
  `Basic ${Buffer.from(`x-access-token:${Redacted.value(token)}`).toString("base64")}`;

const named =
  (prefix: string) =>
  (refs: readonly RemoteRef[]): readonly NamedRef[] =>
    pipe(
      refs,
      Arr.filter((ref) => Str.startsWith(prefix)(ref.name)),
      Arr.map((ref) => ({ name: Str.slice(prefix.length)(ref.name), commit: ref.oid })),
    );

const isPeeled = (tag: NamedRef): boolean => Str.endsWith(PEELED)(tag.name);

const unpeeled = (tag: NamedRef): NamedRef => {
  if (!isPeeled(tag)) {
    return tag;
  }
  return { name: Str.slice(START, tag.name.length - PEELED.length)(tag.name), commit: tag.commit };
};

const tagsOf = (refs: readonly RemoteRef[]): readonly NamedRef[] => {
  const all = named(TAGS)(refs);
  const annotated = new Set(
    pipe(
      all,
      Arr.filter(isPeeled),
      Arr.map((tag) => unpeeled(tag).name),
    ),
  );
  return pipe(
    all,
    Arr.filter((tag) => isPeeled(tag) || !annotated.has(tag.name)),
    Arr.map(unpeeled),
  );
};

const refsOf = (refs: readonly RemoteRef[]): RepoRefs => ({
  branches: named(HEADS)(refs),
  tags: tagsOf(refs),
});

const parsed =
  (url: string) =>
  (reply: Reply): GitHubEffect<Option.Option<RepoRefs>> => {
    if (reply.status === NOT_FOUND) {
      return Effect.succeedNone;
    }
    if (!isOk(reply)) {
      return Effect.fail(unexpected(url)(reply));
    }
    return Result.match(parseLsRefs(reply.bytes), {
      onFailure: (message) => Effect.fail(GitHubError.make({ message })),
      onSuccess: (refs) => Effect.succeedSome(refsOf(refs)),
    });
  };

const UNAUTHORIZED = 401;

const PROTOCOL = { "Git-Protocol": "version=2" } as const;

const upload =
  (session: Session, url: string) =>
  (headers: Readonly<Record<string, string>>): GitHubEffect<Reply> =>
    session.transport({
      method: "POST",
      url,
      headers: { ...PROTOCOL, ...headers },
      body: Option.some({ bytes: REQUEST, type: "application/x-git-upload-pack-request" }),
    });

export const listRefs =
  (session: Session) =>
  (slug: string): GitHubEffect<Option.Option<RepoRefs>> => {
    const url = `${session.endpoints.web}/${slug}.git/git-upload-pack`;
    const send = upload(session, url);
    return send({ Authorization: basic(session.token) }).pipe(
      Effect.filterOrElse(
        (reply) => reply.status !== UNAUTHORIZED,
        () => send({}),
      ),
      Effect.flatMap(parsed(url)),
    );
  };
