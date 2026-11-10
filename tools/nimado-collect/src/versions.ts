import { Array as Arr, Order, pipe } from "effect";

const NEWEST = 1;

const expiredVersions = <Version extends Readonly<{ createdOn: string }>>({
  versions,
  cutoff,
}: Readonly<{ versions: readonly Version[]; cutoff: string }>): readonly Version[] =>
  pipe(
    versions,
    Arr.sortWith(({ createdOn }) => createdOn, Order.flip(Order.String)),
    Arr.drop(NEWEST),
    Arr.filter(({ createdOn }) => Order.isLessThan(Order.String)(createdOn, cutoff)),
  );

export { expiredVersions };
