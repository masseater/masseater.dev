import { Array as Arr, Order, Record as Rec, pipe } from "effect";

import { OWNER_TAG } from "./owners.ts";
import type { Problem } from "./problem.ts";
import type { ValueSite } from "./sites.ts";
import { columnOf, lineOf } from "./syntax.ts";
import { formatValues, valueKey } from "./values.ts";
import type { Value } from "./values.ts";

interface PackageScope {
  readonly name: string;
  readonly dependencies: readonly string[];
}

interface UnownedSite {
  readonly scope: PackageScope;
  readonly file: string;
  readonly start: number;
  readonly line: number;
  readonly column: number;
  readonly values: readonly Value[];
}

const DUPLICATE_THRESHOLD = 1;

const unownedSiteOf =
  (scope: PackageScope) =>
  (site: ValueSite): UnownedSite => ({
    scope,
    file: site.node.getSourceFile().fileName,
    start: site.node.getStart(),
    line: lineOf(site.node),
    column: columnOf(site.node),
    values: site.values,
  });

const canDerive = (left: UnownedSite, right: UnownedSite): boolean =>
  left.scope.name === right.scope.name ||
  left.scope.dependencies.includes(right.scope.name) ||
  right.scope.dependencies.includes(left.scope.name);

const siteKey = (site: UnownedSite): string => `${site.file}#${String(site.start)}`;

const valueSetKey = (site: UnownedSite): string => {
  const keys = pipe(
    site.values,
    Arr.map((value) => valueKey(value)),
  );
  return pipe(Arr.sort(keys, Order.String), Arr.join("\0"));
};

const duplicateProblems =
  (relative: (file: string) => string) =>
  (sites: readonly UnownedSite[]): readonly Problem[] => {
    const unique = Arr.dedupeWith(sites, (left, right) => siteKey(left) === siteKey(right));
    const groups = Rec.values(Arr.groupBy(unique, (site) => valueSetKey(site)));
    return pipe(
      groups,
      Arr.filter((group) => group.length > DUPLICATE_THRESHOLD),
      Arr.flatMap((group) =>
        pipe(
          group,
          Arr.flatMap((site): readonly Problem[] => {
            const related = pipe(
              group,
              Arr.filter((other) => other !== site && canDerive(site, other)),
            );
            if (!Arr.isReadonlyArrayNonEmpty(related)) {
              return [];
            }
            const others = pipe(
              related,
              Arr.map((other) => `${relative(other.file)}:${String(other.line)}`),
              Arr.join(", "),
            );
            return [
              {
                file: site.file,
                line: site.line,
                column: site.column,
                rule: "duplicate-value-set",
                message: `The values ${formatValues(site.values)} are also declared at ${others}. Register one owner with /** @${OWNER_TAG} <concept> */ and derive the others from it.`,
              },
            ];
          }),
        ),
      ),
    );
  };

export { duplicateProblems, unownedSiteOf };
export type { PackageScope, UnownedSite };
