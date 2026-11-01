import { Resvg } from "@resvg/resvg-js";
import { Array as Arr, Effect, Option, Record as Rec, Schema, String as Str, pipe } from "effect";
import { Base64 } from "effect/encoding";
import satori from "satori";
import type { Font } from "satori";
import type { Plugin } from "vite-plus";
import { parse } from "yaml";

import { BOLD, JAPANESE, LATIN, REGULAR, cardElement, siteElement } from "./og-card.ts";
import type { Card } from "./og-card.ts";
import { categories } from "./src/entities/entry/model/category.ts";
import { entryOgImagePath } from "./src/entities/entry/model/entry.ts";
import { site } from "./src/shared/config/site.ts";

const CLIENT_ENVIRONMENT = "client";
const FRONTMATTER = /^---\n(?<yaml>[\s\S]*?)\n---/u;
const MARKDOWN = /\.md$/u;
const LEADING_SLASH = /^\//u;

const fontFiles = [
  {
    name: LATIN,
    weight: BOLD,
    url: import.meta.resolve("@fontsource/noto-sans-jp/files/noto-sans-jp-latin-700-normal.woff"),
  },
  {
    name: JAPANESE,
    weight: BOLD,
    url: import.meta
      .resolve("@fontsource/noto-sans-jp/files/noto-sans-jp-japanese-700-normal.woff"),
  },
  {
    name: LATIN,
    weight: REGULAR,
    url: import.meta.resolve("@fontsource/noto-sans-jp/files/noto-sans-jp-latin-400-normal.woff"),
  },
  {
    name: JAPANESE,
    weight: REGULAR,
    url: import.meta
      .resolve("@fontsource/noto-sans-jp/files/noto-sans-jp-japanese-400-normal.woff"),
  },
] as const;

const OgFrontmatter = Schema.Struct({ title: Schema.String, published: Schema.Boolean });

const decodeFrontmatter = Schema.decodeUnknownOption(OgFrontmatter);

type Source = Readonly<{
  root: string;
  readdir: (path: string) => Promise<string[]>;
  readFile: (path: string) => Promise<Uint8Array>;
}>;

type File = Readonly<{ category: Card["category"]; name: string }>;

const readBytes = (source: Source, path: string): Effect.Effect<Uint8Array> =>
  Effect.promise(() => source.readFile(`${source.root}/${path}`));

const frontmatterOf = (markdown: string): Option.Option<typeof OgFrontmatter.Type> =>
  pipe(
    markdown,
    Str.match(FRONTMATTER),
    Option.flatMap(({ groups }) => Option.fromNullishOr(groups)),
    Option.flatMap((groups) => Rec.get(groups, "yaml")),
    Option.flatMap((yaml) => decodeFrontmatter(parse(yaml))),
  );

const cardOf = (source: Source, { category, name }: File): Effect.Effect<Option.Option<Card>> =>
  readBytes(source, `content/${category}/${name}`).pipe(
    Effect.map((bytes) =>
      pipe(
        frontmatterOf(new TextDecoder().decode(bytes)),
        Option.filter(({ published }) => published),
        Option.map(({ title }) => ({
          category,
          slug: pipe(name, Str.replace(MARKDOWN, "")),
          title,
        })),
      ),
    ),
  );

const filesOf = (source: Source, category: Card["category"]): Effect.Effect<readonly File[]> =>
  Effect.promise(() => source.readdir(`${source.root}/content/${category}`)).pipe(
    Effect.map((names) =>
      pipe(
        names,
        Arr.filter(Str.endsWith(".md")),
        Arr.map((name) => ({ category, name })),
      ),
    ),
  );

const cardsOf = (source: Source): Effect.Effect<readonly Card[]> =>
  pipe(
    categories,
    Effect.forEach((category) => filesOf(source, category)),
    Effect.map(Arr.flatten),
    Effect.flatMap(Effect.forEach((file) => cardOf(source, file))),
    Effect.map(Arr.getSomes),
  );

const fontsOf = (source: Source): Effect.Effect<readonly Font[]> =>
  pipe(
    fontFiles,
    Effect.forEach(({ name, weight, url }) =>
      Effect.promise(() => source.readFile(decodeURIComponent(new URL(url).pathname))).pipe(
        Effect.map((bytes) => ({
          name,
          data: new Uint8Array(bytes).buffer,
          weight,
          style: "normal" as const,
        })),
      ),
    ),
  );

const avatarOf = (source: Source): Effect.Effect<string> =>
  readBytes(source, "public/avatars/masseater.png").pipe(
    Effect.map((bytes) => `data:image/png;base64,${Base64.encode(bytes)}`),
  );

type Png = Readonly<{ fileName: string; png: Uint8Array }>;

const toFileName = Str.replace(LEADING_SLASH, "");

const renderCards = (source: Source): Effect.Effect<readonly Png[]> =>
  Effect.all({ cards: cardsOf(source), avatar: avatarOf(source), fonts: fontsOf(source) }).pipe(
    Effect.flatMap(({ cards, avatar, fonts }) =>
      pipe(
        cards,
        Arr.map((card) => ({
          element: cardElement(avatar)(card),
          fileName: toFileName(entryOgImagePath(card)),
        })),
        Arr.prepend({ element: siteElement(avatar), fileName: toFileName(site.ogImage.path) }),
        Effect.forEach(({ element, fileName }) =>
          Effect.promise(() =>
            satori(element, {
              width: site.ogImage.width,
              height: site.ogImage.height,
              fonts: [...fonts],
            }),
          ).pipe(Effect.map((svg) => ({ fileName, png: new Resvg(svg).render().asPng() }))),
        ),
      ),
    ),
  );

const ogImage = (): Plugin => {
  let root = "";
  return {
    name: "og-image",
    apply: "build",
    configResolved: (config) => {
      ({ root } = config);
    },
    generateBundle() {
      if (this.environment.name !== CLIENT_ENVIRONMENT) {
        return Promise.resolve();
      }
      const { fs } = this;
      const rendered = renderCards({
        root,
        readdir: (path) => fs.readdir(path),
        readFile: (path) => fs.readFile(path),
      });
      const emitted = rendered.pipe(
        Effect.flatMap((pngs) =>
          Effect.sync(() => {
            for (const { fileName, png } of pngs) {
              this.emitFile({ type: "asset", fileName, source: png });
            }
          }),
        ),
      );
      return Effect.runPromise(emitted);
    },
  };
};

export { ogImage };
