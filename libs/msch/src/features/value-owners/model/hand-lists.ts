import { Array as Arr, Option, pipe } from "effect";

import type { Problem } from "#/shared/lib/problem.ts";

import { declaredNameProblem } from "./declared-names.ts";
import type { UnownedSite } from "./duplicates.ts";
import { listedPathProblem } from "./listed-paths.ts";
import { nameListOf } from "./name-lists.ts";
import type { FileLiterals } from "./name-lists.ts";
import type { RepositoryNames } from "./repository-names.ts";
import { subsetListProblem } from "./subset-lists.ts";

export const handWrittenNameProblems =
  ({
    repository,
    literals,
  }: Readonly<{ repository: RepositoryNames; literals: readonly FileLiterals[] }>) =>
  (sites: readonly UnownedSite[]): readonly Problem[] => {
    const lists = pipe(
      sites,
      Arr.dedupeWith((left, right) => left.file === right.file && left.start === right.start),
      Arr.map(nameListOf),
      Arr.getSomes,
    );
    const { relative } = repository;
    const listedPath = listedPathProblem(repository);
    const declared = declaredNameProblem({ literals, relative });
    const subset = subsetListProblem({ lists, literals, relative });
    return pipe(
      lists,
      Arr.map((list) =>
        listedPath(list).pipe(
          Option.orElse(() => declared(list)),
          Option.orElse(() => subset(list)),
        ),
      ),
      Arr.getSomes,
    );
  };
