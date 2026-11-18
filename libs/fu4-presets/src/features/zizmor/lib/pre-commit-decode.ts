import { Array as Arr, Result } from "effect";

import type {
  RemoteUrl,
  PreCommitConfigModel,
  PreCommitHooksModel,
  RepoModel,
} from "#/features/zizmor/model/pre-commit.ts";

import { anyScalar, required, sequence, string, struct } from "./decode.ts";
import type { Decoder } from "./decode.ts";

const SPECIAL = new Set(["local", "meta", "builtin"]);

const nonEmpty =
  <Value>(item: Decoder<Value>): Decoder<readonly Value[]> =>
  (node) =>
    Result.flatMap(sequence(item)(node), (items) =>
      Result.liftPredicate(
        items,
        (each) => Arr.isReadonlyArrayNonEmpty(each),
        () => "expected at least one item in list",
      ),
    );

const hook = struct((fields) => required("id")(string)(fields));

const parseUrl = (text: string): Result.Result<RemoteUrl, string> =>
  Result.try({
    try: (): RemoteUrl => {
      const { href, protocol, hostname, pathname } = new URL(text);
      return { href, protocol, hostname, pathname };
    },
    catch: () => `invalid URL: ${text}`,
  });

const repo: Decoder<RepoModel> = struct((fields) =>
  Result.flatMap(required("repo")(string)(fields), (name): Result.Result<RepoModel, string> => {
    if (SPECIAL.has(name)) {
      return Result.succeed({ type: "special", repo: name });
    }
    return Result.gen(function* decode() {
      const url = yield* parseUrl(name);
      const rev = yield* required("rev")(string)(fields);
      yield* required("hooks")(nonEmpty(hook))(fields);
      return { type: "remote", repo: name, url, rev };
    });
  }),
);

export const decodePreCommitConfig: Decoder<PreCommitConfigModel> = struct((fields) =>
  Result.map(required("repos")(nonEmpty(repo))(fields), (repos) => ({ repos })),
);

const hookDefinition = struct((fields) =>
  Result.gen(function* decode() {
    const id = yield* required("id")(anyScalar)(fields);
    yield* required("name")(anyScalar)(fields);
    yield* required("entry")(anyScalar)(fields);
    yield* required("language")(anyScalar)(fields);
    return id;
  }),
);

export const decodePreCommitHooks: Decoder<PreCommitHooksModel> = (node) =>
  Result.map(nonEmpty(hookDefinition)(node), (hooks) => ({ hooks }));
