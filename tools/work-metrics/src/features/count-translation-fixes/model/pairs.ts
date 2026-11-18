import { Array as Arr, Option, pipe } from "effect";

export type Commit = Readonly<{ sha: string; subject: string; merge: boolean }>;

export type Pair = Readonly<{ raw: string; fix: string }>;

const RAW = /PLaMo/u;
const FIX = /直|fix/iu;
const NEXT = 1;

const isRaw = (commit: Commit): boolean => RAW.test(commit.subject) && !FIX.test(commit.subject);

const pairAt =
  (commits: readonly Commit[]) =>
  (index: number): Option.Option<Pair> =>
    pipe(
      commits,
      Arr.drop(index + NEXT),
      Arr.findFirst((commit) => !commit.merge),
      Option.filter((next) => FIX.test(next.subject)),
      Option.flatMap((next) =>
        Option.map(Arr.get(commits, index), (raw) => ({ raw: raw.sha, fix: next.sha })),
      ),
    );

export const pairsOf = (commits: readonly Commit[]): readonly Pair[] =>
  pipe(
    commits,
    Arr.map((commit, index) => ({ commit, index })),
    Arr.filter(({ commit }) => isRaw(commit)),
    Arr.map(({ index }) => pairAt(commits)(index)),
    Arr.getSomes,
  );
