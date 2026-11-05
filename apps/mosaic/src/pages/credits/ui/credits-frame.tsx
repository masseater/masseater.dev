import { Link, getRouteApi } from "@tanstack/react-router";
import { CHARACTERS } from "@thumb-mosaic/mosaic";
import { Array, Option, pipe } from "effect";
import type { ReactNode } from "react";

const route = getRouteApi("/$slug_/credits");

const HEADING = "クレジット";
const BACK = "モザイクに戻る";
const EXACT = { exact: true } as const;
const SOURCES = [
  "VocaDB API",
  "YouTube API",
  "i.ytimg.com",
  "ニコニコ動画API",
  "nicovideo.cdn.nimg.jp",
] as const;

const creditOf = (slug: string): readonly string[] =>
  pipe(
    Array.findFirst(CHARACTERS, (character) => character.slug === slug),
    Option.map((character) => [character.credit]),
    Option.getOrElse((): readonly string[] => []),
  );

const CreditsFrame = ({ children }: Readonly<{ children?: ReactNode }>): ReactNode => {
  const params = route.useParams();
  const search = route.useSearch();
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-4 p-6 text-sm sm:p-8">
      <Link
        to="/$slug"
        params={params}
        search={search}
        activeOptions={EXACT}
        className="self-start underline underline-offset-2"
      >
        {BACK}
      </Link>
      <h1 className="text-2xl font-bold">{HEADING}</h1>
      <ul className="text-muted-foreground flex flex-col gap-1">
        {pipe(
          [...creditOf(params.slug), ...SOURCES],
          Array.map((line) => <li key={line}>{line}</li>),
        )}
      </ul>
      {children}
    </main>
  );
};

export { CreditsFrame };
