import { Array as Arr, Option, String as Str, pipe } from "effect";

import { HOME, NAV_GROUPS } from "#/shared/config/index.ts";
import type { NavItem, PortalPath } from "#/shared/config/index.ts";

export type Crumb = Readonly<{ label: string; to: Option.Option<PortalPath> }>;

const SEARCH: Crumb = { label: "検索", to: Option.none() };

const here = (label: string): Crumb => ({ label, to: Option.none() });

const linked = (item: NavItem): Crumb => ({ label: item.label, to: Option.some(item.to) });

const decoded = (segment: string): string => {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
};

const restOf = ({
  item,
  pathname,
}: Readonly<{ item: NavItem; pathname: string }>): readonly string[] =>
  pipe(
    pathname,
    Str.slice(item.to.length),
    Str.split("/"),
    Arr.filter(Str.isNonEmpty),
    Arr.map(decoded),
  );

const covers = ({ item, pathname }: Readonly<{ item: NavItem; pathname: string }>): boolean =>
  pathname === item.to || Str.startsWith(`${item.to}/`)(pathname);

const sectionCrumbs = (pathname: string): Option.Option<readonly Crumb[]> =>
  pipe(
    NAV_GROUPS,
    Arr.flatMap((group) =>
      pipe(
        group.items,
        Arr.map((item) => ({ group, item })),
      ),
    ),
    Arr.findFirst(({ item }) => covers({ item, pathname })),
    Option.map(({ group, item }) => {
      const rest = restOf({ item, pathname });
      if (Arr.isReadonlyArrayNonEmpty(rest)) {
        return [here(group.label), linked(item), here(pipe(rest, Arr.join(" / ")))];
      }
      return [here(group.label), here(item.label)];
    }),
  );

export const crumbsOf = (pathname: string): readonly Crumb[] => {
  if (pathname === "/search") {
    return [SEARCH];
  }
  return pipe(
    sectionCrumbs(pathname),
    Option.getOrElse(() => [here(HOME.label)]),
  );
};
