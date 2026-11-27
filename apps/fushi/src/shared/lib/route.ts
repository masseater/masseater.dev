import { Array as Arr, Match, Option, Record as Rec, String as Str, pipe } from "effect";
import { Atom } from "effect/reactivity";

export type Route =
  | Readonly<{ page: "styles" }>
  | Readonly<{ page: "overview"; style: string }>
  | Readonly<{ page: "category"; style: string; category: string }>
  | Readonly<{ page: "judge"; style: string; habit: Option.Option<string> }>
  | Readonly<{ page: "songs"; style: string; song: Option.Option<string> }>
  | Readonly<{ page: "import"; style: string }>;

const STYLES: Route = { page: "styles" };

const PAGE = 1;

const REST = 2;

const LEADING = /^#\/?/u;

const SLASH = "/";

const EMPTY = "";

type Build = (style: string, rest: Option.Option<string>) => Route;

const PAGES: Readonly<Record<string, Build>> = {
  category: (style, rest) =>
    Option.match(rest, {
      onNone: (): Route => ({ page: "overview", style }),
      onSome: (category): Route => ({ page: "category", style, category }),
    }),
  judge: (style, habit) => ({ page: "judge", style, habit }),
  songs: (style, song) => ({ page: "songs", style, song }),
  import: (style) => ({ page: "import", style }),
};

const partsOf = (hash: string): readonly string[] =>
  pipe(
    hash,
    Str.replace(LEADING, EMPTY),
    Str.split(SLASH),
    Arr.map((part) => decodeURIComponent(part)),
  );

const pageOf =
  (parts: readonly string[]) =>
  (style: string): Route =>
    pipe(
      Arr.get(parts, PAGE),
      Option.flatMap((page) => Rec.get(PAGES, page)),
      Option.match({
        onNone: (): Route => ({ page: "overview", style }),
        onSome: (build) => build(style, Arr.get(parts, REST)),
      }),
    );

export const routeOf = (hash: string): Route => {
  const parts = partsOf(hash);
  return pipe(
    Arr.head(parts),
    Option.filter(Str.isNonEmpty),
    Option.match({ onNone: () => STYLES, onSome: pageOf(parts) }),
  );
};

const joined = (segments: readonly string[]): string =>
  pipe(
    segments,
    Arr.map((segment) => encodeURIComponent(segment)),
    Arr.prepend("#"),
    Arr.join(SLASH),
  );

const segmentsOf = (route: Route): readonly string[] =>
  Match.value(route).pipe(
    Match.discriminatorsExhaustive("page")({
      styles: () => [EMPTY],
      overview: ({ style }) => [style],
      category: ({ style, category }) => [style, "category", category],
      judge: ({ style, habit }) => [style, "judge", ...Option.toArray(habit)],
      songs: ({ style, song }) => [style, "songs", ...Option.toArray(song)],
      import: ({ style }) => [style, "import"],
    }),
  );

export const hrefOf = (route: Route): string => joined(segmentsOf(route));

export const navigate = (route: Route): void => {
  globalThis.location.hash = hrefOf(route);
};

/** @internal */
export const routeAtom = Atom.make((context) => {
  const follow = (): void => {
    context.setSelf(routeOf(globalThis.location.hash));
  };
  globalThis.addEventListener("hashchange", follow);
  context.addFinalizer(() => {
    globalThis.removeEventListener("hashchange", follow);
  });
  return routeOf(globalThis.location.hash);
}).pipe(Atom.keepAlive);
