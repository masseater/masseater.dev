import { Resvg } from "@resvg/resvg-js";
import { Array as Arr, Effect, Option, Record as Rec, Schema, String as Str, pipe } from "effect";
import { Base64 } from "effect/encoding";
import { createElement } from "react";
import type { ReactNode } from "react";
import satori from "satori";
import type { Font } from "satori";
import type { Plugin } from "vite-plus";
import { parse } from "yaml";

import { categories, categoryMeta } from "./src/entities/entry/model/category.ts";
import type { Category } from "./src/entities/entry/model/category.ts";
import { entryOgImagePath } from "./src/entities/entry/model/entry.ts";
import { site } from "./src/shared/config/site.ts";

const BOLD = 700;
const REGULAR = 400;
const TITLE_LINES = 3;
const AVATAR_SIZE = 72;
const CLIENT_ENVIRONMENT = "client";
const FRONTMATTER = /^---\n(?<yaml>[\s\S]*?)\n---/u;
const MARKDOWN = /\.md$/u;
const LEADING_SLASH = /^\//u;
const LATIN = "Noto Sans JP Latin";
const JAPANESE = "Noto Sans JP";

const colors = { background: "#fafafa", foreground: "#18181b", muted: "#71717a" } as const;

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

type Card = Readonly<{ category: Category; slug: string; title: string }>;

type Source = Readonly<{
  root: string;
  readdir: (path: string) => Promise<string[]>;
  readFile: (path: string) => Promise<Uint8Array>;
}>;

type File = Readonly<{ category: Category; name: string }>;

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

const filesOf = (source: Source, category: Category): Effect.Effect<readonly File[]> =>
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

const categoryLabel = (card: Card): ReactNode =>
  createElement(
    "div",
    { style: { display: "flex", fontSize: 32, fontWeight: BOLD, color: colors.muted } },
    categoryMeta[card.category].title,
  );

const titleText = (card: Card): ReactNode =>
  createElement(
    "div",
    {
      style: {
        display: "block",
        fontSize: 60,
        fontWeight: BOLD,
        lineHeight: 1.35,
        lineClamp: TITLE_LINES,
      },
    },
    card.title,
  );

const byline = (avatar: string): ReactNode =>
  createElement(
    "div",
    { style: { display: "flex", alignItems: "center", gap: 24 } },
    createElement("img", {
      src: avatar,
      width: AVATAR_SIZE,
      height: AVATAR_SIZE,
      style: { borderRadius: AVATAR_SIZE },
    }),
    createElement("div", { style: { display: "flex", fontSize: 32, fontWeight: BOLD } }, site.name),
    createElement(
      "div",
      { style: { display: "flex", marginLeft: "auto", fontSize: 30, color: colors.muted } },
      new URL(site.url).host,
    ),
  );

const cardElement = (card: Card, avatar: string): ReactNode =>
  createElement(
    "div",
    {
      style: {
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        width: "100%",
        height: "100%",
        padding: "72px 88px",
        backgroundColor: colors.background,
        color: colors.foreground,
        fontFamily: `${LATIN}, ${JAPANESE}`,
      },
    },
    categoryLabel(card),
    titleText(card),
    byline(avatar),
  );

type Png = Readonly<{ fileName: string; png: Uint8Array }>;

const renderCards = (source: Source): Effect.Effect<readonly Png[]> =>
  Effect.all({ cards: cardsOf(source), avatar: avatarOf(source), fonts: fontsOf(source) }).pipe(
    Effect.flatMap(({ cards, avatar, fonts }) =>
      pipe(
        cards,
        Effect.forEach((card) =>
          Effect.promise(() =>
            satori(cardElement(card, avatar), {
              width: site.ogImage.width,
              height: site.ogImage.height,
              fonts: [...fonts],
            }),
          ).pipe(
            Effect.map((svg) => ({
              fileName: pipe(entryOgImagePath(card), Str.replace(LEADING_SLASH, "")),
              png: new Resvg(svg).render().asPng(),
            })),
          ),
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
