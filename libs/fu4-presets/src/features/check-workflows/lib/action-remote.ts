import { Array as Arr, Option, String as Str, pipe } from "effect";

import { OUTDATED, popular } from "#/entities/action/index.ts";
import type { ExecAction } from "#/entities/workflow/index.ts";
import type { Fail } from "#/features/check-workflows/lib/workflow-rule.ts";
import { quote } from "#/shared/text/index.ts";
import type { Text } from "#/shared/yaml/index.ts";

import { checkInputs } from "./action-inputs.ts";

const DOCKER = "docker://";
const NEXT = 1;
const START = 0;

const invalidFormat = (fail: Fail, uses: Text, why: string): void => {
  fail(
    uses,
    `specifying action ${quote(uses.value)} in invalid format because ${why}. available formats are "{owner}/{repo}@{ref}" or "{owner}/{repo}/{path}@{ref}"`,
  );
};

const splitOnce =
  (separator: string) =>
  (text: string): Option.Option<readonly [string, string]> =>
    Option.map(Str.indexOf(separator)(text), (index) => [
      Str.slice(START, index)(text),
      Str.slice(index + NEXT)(text),
    ]);

const repoOf = (rest: string): string =>
  pipe(
    Str.split("/")(rest),
    Arr.head,
    Option.getOrElse(() => ""),
  );

const ownedProblem = (path: string, reference: string): Option.Option<string> =>
  Option.match(splitOnce("/")(path), {
    onNone: () => Option.some("owner is missing"),
    onSome: ([owner, rest]) =>
      Option.liftPredicate(
        "owner and repo and ref should not be empty",
        () => Str.isEmpty(owner) || Str.isEmpty(repoOf(rest)) || Str.isEmpty(reference),
      ),
  });

const formatProblem = (spec: string): Option.Option<string> =>
  Option.match(splitOnce("@")(spec), {
    onNone: () => Option.some("ref is missing"),
    onSome: ([path, reference]) => ownedProblem(path, reference),
  });

export interface Remote {
  readonly fail: Fail;
  readonly uses: Text;
}

export const checkRepo =
  ({ fail, uses }: Remote) =>
  (exec: ExecAction): void => {
    for (const why of Option.toArray(formatProblem(uses.value))) {
      invalidFormat(fail, uses, why);
    }
    const metadata = popular(uses.value);
    if (Option.isNone(metadata)) {
      if (OUTDATED.has(uses.value)) {
        fail(
          uses,
          `the runner of ${quote(uses.value)} action is too old to run on GitHub Actions. update the action's version to fix this issue`,
        );
      }
      return;
    }
    if (!metadata.value.skipInputs) {
      checkInputs({ fail, uses, describe: quote(uses.value) })(metadata.value, exec);
    }
  };

export const isDocker = (spec: string): boolean => Str.startsWith(DOCKER)(spec);

export const checkDocker = ({ fail, uses }: Remote): void => {
  const rest = Str.slice(DOCKER.length)(uses.value);
  const tagged = splitOnce(":")(rest);
  for (const [image, tag] of Option.toArray(tagged)) {
    if (Str.isEmpty(tag)) {
      fail(uses, `tag of Docker action should not be empty: ${quote(`${DOCKER}${image}`)}`);
    }
  }
};
