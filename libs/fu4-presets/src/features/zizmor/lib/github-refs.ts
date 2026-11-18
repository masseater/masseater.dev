import { Array as Arr, Effect, Option, Order, String as Str, pipe } from "effect";

import type {
  GitHubClient,
  GitHubEffect,
  NamedRef,
  ResolvedRef,
} from "#/features/zizmor/model/github.ts";

import { refSlug } from "./uses.ts";
import type { RepoRef } from "./uses.ts";

const SEPARATOR = "/";

const leafOf = (subpath: string): string =>
  Option.getOrElse(Arr.last(Str.split(SEPARATOR)(subpath)), () => subpath);

const underPrefix =
  (name: string) =>
  (prefix: string): boolean =>
    Str.startsWith(`${prefix}${SEPARATOR}`)(name);

const preferred =
  (subpath: Option.Option<string>) =>
  (name: string): boolean =>
    Option.match(subpath, {
      onNone: () => !Str.includes(SEPARATOR)(name),
      onSome: (path) => pipe([path, leafOf(path)], Arr.some(underPrefix(name))),
    });

const rank = (subpath: Option.Option<string>): Order.Order<NamedRef> =>
  Order.combine(
    Order.mapInput(Order.Boolean, (tag: NamedRef) => preferred(subpath)(tag.name)),
    Order.mapInput(Order.Number, (tag: NamedRef) => tag.name.length),
  );

export const bestTag =
  (subpath: Option.Option<string>) =>
  (commit: string) =>
  (tags: readonly NamedRef[]): Option.Option<NamedRef> =>
    pipe(
      tags,
      Arr.filter((tag) => tag.commit === commit),
      (matching) => Arr.sort(matching, rank(subpath)),
      Arr.last,
    );

const subpathOf = (ref: RepoRef): Option.Option<string> => {
  if (ref.type === "uses") {
    return ref.uses.subpath;
  }
  return Option.none();
};

export const longestTag =
  (client: GitHubClient) =>
  (ref: RepoRef) =>
  (commit: string): GitHubEffect<Option.Option<NamedRef>> =>
    Option.match(refSlug(ref), {
      onNone: () => Effect.succeedNone,
      onSome: (slug) =>
        Effect.map(client.refs(slug.full), ({ tags }) => bestTag(subpathOf(ref))(commit)(tags)),
    });

export const lookupRef =
  (client: GitHubClient) =>
  (slug: string) =>
  (name: string): GitHubEffect<Option.Option<ResolvedRef>> =>
    Effect.map(client.refs(slug), ({ branches, tags }) =>
      pipe(
        Arr.findFirst(branches, (branch) => branch.name === name),
        Option.map((branch): ResolvedRef => ({
          name: branch.name,
          commit: branch.commit,
          kind: "branch",
        })),
        Option.orElse(() =>
          pipe(
            Arr.findFirst(tags, (tag) => tag.name === name),
            Option.map((tag): ResolvedRef => ({ name: tag.name, commit: tag.commit, kind: "tag" })),
          ),
        ),
      ),
    );
