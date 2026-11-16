import { Option, pipe } from "effect";

import type { Song } from "#/entities/song/index.ts";
import { sectionPath } from "#/shared/config/index.ts";
import { defaultImage, notFoundHead, pageTitle, seo } from "#/shared/lib/index.ts";
import type { Head } from "#/shared/lib/index.ts";

import dawCss from "@masseater.dev/daw-view/styles.css?url";

const STYLESHEET = { rel: "stylesheet", href: dawCss } as const;

export const songHead = (song: Song | undefined): Head =>
  pipe(
    Option.fromUndefinedOr(song),
    Option.match({
      onNone: () => notFoundHead,
      onSome: ({ title, description, slug }) => {
        const head = seo({
          title: pageTitle(title),
          description,
          path: `${sectionPath("ai-produced")}/${slug}`,
          type: "article",
          image: defaultImage,
          extra: [],
          structuredData: [],
        });
        return { ...head, links: [...head.links, STYLESHEET] };
      },
    }),
  );
