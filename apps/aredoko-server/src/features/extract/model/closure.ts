import { Array, HashMap, HashSet, Option, pipe } from "effect";

const referencesOf =
  (references: HashMap.HashMap<string, readonly string[]>) =>
  (guid: string): readonly string[] =>
    pipe(
      HashMap.get(references, guid),
      Option.getOrElse((): readonly string[] => []),
    );

const expand = (
  references: HashMap.HashMap<string, readonly string[]>,
  seen: HashSet.HashSet<string>,
  frontier: readonly string[],
): HashSet.HashSet<string> => {
  const next = pipe(
    frontier,
    Array.filter((guid) => HashMap.has(references, guid) && !HashSet.has(seen, guid)),
    Array.dedupe,
  );
  return Array.match(next, {
    onEmpty: () => seen,
    onNonEmpty: (added) => {
      const grown = HashSet.union(seen, HashSet.fromIterable(added));
      const reached = pipe(added, Array.flatMap(referencesOf(references)));
      return expand(references, grown, reached);
    },
  });
};

const closure = ({
  roots,
  references,
}: {
  readonly roots: readonly string[];
  readonly references: HashMap.HashMap<string, readonly string[]>;
}): HashSet.HashSet<string> => expand(references, HashSet.empty(), roots);

const missingOf = ({
  included,
  references,
}: {
  readonly included: HashSet.HashSet<string>;
  readonly references: HashMap.HashMap<string, readonly string[]>;
}): readonly string[] =>
  pipe(
    Array.fromIterable(included),
    Array.flatMap(referencesOf(references)),
    Array.filter((guid) => !HashMap.has(references, guid)),
    Array.dedupe,
  );

export { closure, missingOf };
