import { Option, pipe } from "effect";

import { BASE_PATH, SITE_ORIGIN } from "#/shared/config/index.ts";
import { optionalCardMeta } from "#/shared/lib/card.ts";
import type { Card, Meta } from "#/shared/lib/card.ts";

import { GALLERY_TITLE } from "./title.ts";

const galleryCard = (cover: Card): Card => ({
  title: GALLERY_TITLE,
  description:
    "キャラクターの公式イラストを、そのキャラクターを使った動画のサムネイルだけで組んだモザイクアート",
  image: cover.image,
  url: `${SITE_ORIGIN}${BASE_PATH}/`,
});

export const galleryHead = (cover: Option.Option<Card>): Readonly<{ meta: Meta[] }> => ({
  meta: optionalCardMeta(pipe(cover, Option.map(galleryCard))),
});
