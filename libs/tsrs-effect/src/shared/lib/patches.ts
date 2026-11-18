import { Array as Arr, String as Str, pipe } from "effect";

const PATCH = ".patch";

export interface PatchSources {
  readonly theirs: readonly string[];
  readonly ours: readonly string[];
  readonly skip: readonly string[];
}

export interface Patch {
  readonly name: string;
  readonly ours: boolean;
}

export const patchesOf = ({ theirs, ours, skip }: PatchSources): readonly Patch[] =>
  pipe(
    theirs,
    Arr.filter((name) => Str.endsWith(PATCH)(name) && !Arr.contains(skip, name)),
    Arr.sortBy(Str.Order),
    Arr.map((name): Patch => ({ name, ours: Arr.contains(ours, name) })),
  );
