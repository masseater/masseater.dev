import type { QueryClient } from "@tanstack/react-query";
import { Array, Effect, Option, pipe } from "effect";

import {
  bundledMosaic,
  mosaicTitle,
  slugFile,
  variantFile,
  loadVisit,
} from "#/entities/mosaic/index.ts";
import type { Mosaic, Visit, Assignment, Loaded } from "#/entities/mosaic/index.ts";
import { BASE_PATH, SITE_ORIGIN } from "#/shared/config/index.ts";
import { optionalCardMeta } from "#/shared/lib/card.ts";
import type { Card, Meta } from "#/shared/lib/card.ts";
import { runtime } from "#/shared/lib/telemetry.ts";

const OVERVIEW = 0;
const BEST_VARIANT = 0;
const BLOCK_FILE = 2;

interface Preload extends Assignment {
  readonly images: readonly string[];
  readonly card: Option.Option<Card>;
}

interface PreloadLink {
  readonly rel: "preload";
  readonly as: "image";
  readonly href: string;
  readonly fetchPriority: "high";
}

interface Head {
  links: PreloadLink[];
  meta: Meta[];
}

const overviewImages = (visit: Omit<Visit, "seed" | "choice">): readonly string[] =>
  pipe(
    Array.get(visit.mosaic.levels, OVERVIEW),
    Option.map((level) =>
      pipe(
        level.blocks,
        Array.map((block) => variantFile(visit)(BEST_VARIANT, block[BLOCK_FILE])),
      ),
    ),
    Option.getOrElse((): readonly string[] => []),
  );

const cardOf = ({ mosaic, slug }: Omit<Visit, "seed" | "choice">): Card => ({
  title: mosaicTitle(slug),
  description: `動画のサムネイルを一枚ずつ並べて描いた${mosaic.character}`,
  image: `${SITE_ORIGIN}${slugFile({ slug, file: mosaic.og })}`,
  url: `${SITE_ORIGIN}${BASE_PATH}/${slug}`,
});

type Preview = Pick<Preload, "images" | "card">;

const previewOf = (slug: string, mosaic: Option.Option<Mosaic>): Preview => ({
  images: Option.match(mosaic, {
    onNone: (): readonly string[] => [],
    onSome: (found) => overviewImages({ slug, mosaic: found }),
  }),
  card: pipe(
    mosaic,
    Option.map((found) => cardOf({ slug, mosaic: found })),
  ),
});

export const bundledPreview = (slug: string): Preview => previewOf(slug, bundledMosaic(slug));

const preloadOf = (slug: string, { seed, choice, mosaic }: Loaded): Preload => ({
  seed,
  choice,
  ...previewOf(slug, mosaic),
});

export const loadMosaic = ({
  queryClient,
  slug,
  seed,
}: Readonly<{
  queryClient: QueryClient;
  slug: string;
  seed: Option.Option<number>;
}>): Promise<Preload> =>
  runtime.runPromise(
    loadVisit({ queryClient, slug, seed }).pipe(Effect.map((loaded) => preloadOf(slug, loaded))),
  );

const preloadLink = (href: string): PreloadLink => ({
  rel: "preload",
  as: "image",
  href,
  fetchPriority: "high",
});

export const mosaicHead = ({ images, card }: Preview): Head => ({
  links: pipe(images, Array.map(preloadLink)),
  meta: optionalCardMeta(card),
});
