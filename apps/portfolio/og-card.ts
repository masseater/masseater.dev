import { backdropPalette } from "@masseater.dev/ui/backdrop-palette";
import { loadDefaultJapaneseParser } from "budoux";
import { Array as Arr, String as Str, pipe } from "effect";
import { createElement } from "react";
import type { ReactNode } from "react";

import { categories, categoryMeta } from "./src/entities/entry/model/category.ts";
import type { Category } from "./src/entities/entry/model/category.ts";
import { site } from "./src/shared/config/site.ts";

const BOLD = 700;
const REGULAR = 400;
const LATIN = "Noto Sans JP Latin";
const JAPANESE = "Noto Sans JP";
const TITLE_LINES = 4;
const TITLE_LINE_HEIGHT = 1.4;
const LONG_TITLE = 32;
const SECTION_SEPARATOR = "   ·   ";

const sizes = {
  stageMargin: 48,
  cardRadius: 40,
  label: 26,
  titleShort: 64,
  titleLong: 52,
  avatar: 64,
  author: 32,
  host: 28,
  siteAvatar: 144,
  siteName: 120,
  siteGap: 36,
  sections: 28,
} as const;

const colors = {
  foreground: "#18181b",
  muted: "#52525b",
  surface: "#ffffff",
  glass: "rgba(255, 255, 255, 0.55)",
  ring: "rgba(24, 24, 27, 0.06)",
  shadow: "rgba(99, 102, 241, 0.12)",
} as const;

const backdrop = pipe(
  [
    `radial-gradient(circle at 12% 18%, ${backdropPalette.sky}, transparent 55%)`,
    `radial-gradient(circle at 88% 12%, ${backdropPalette.pink}, transparent 50%)`,
    `radial-gradient(circle at 50% 50%, ${backdropPalette.amber}, transparent 60%)`,
    `radial-gradient(circle at 85% 90%, ${backdropPalette.indigo}, transparent 55%)`,
    `radial-gradient(circle at 15% 85%, ${backdropPalette.mint}, transparent 55%)`,
  ],
  Arr.join(", "),
);

const phrases = loadDefaultJapaneseParser();

type Card = Readonly<{ category: Category; slug: string; title: string }>;

const stage = (child: ReactNode): ReactNode =>
  createElement(
    "div",
    {
      style: {
        display: "flex",
        width: "100%",
        height: "100%",
        backgroundColor: backdropPalette.base,
        backgroundImage: backdrop,
        color: colors.foreground,
        fontFamily: `${LATIN}, ${JAPANESE}`,
      },
    },
    child,
  );

const tracked = (text: string, fontSize: number): ReactNode =>
  createElement(
    "div",
    {
      style: {
        display: "flex",
        fontSize,
        fontWeight: BOLD,
        letterSpacing: "0.2em",
        color: colors.muted,
        textTransform: "uppercase",
      },
    },
    text,
  );

const avatarImage = (avatar: string, size: number): ReactNode =>
  createElement("img", {
    src: avatar,
    width: size,
    height: size,
    style: { borderRadius: size, border: `3px solid ${colors.surface}` },
  });

const titleSize = (title: string): number => {
  if (Str.length(title) > LONG_TITLE) {
    return sizes.titleLong;
  }
  return sizes.titleShort;
};

const phrase = (text: string): ReactNode =>
  createElement("div", { style: { display: "flex", whiteSpace: "pre" } }, text);

const phraseLines = (title: string): ReactNode => {
  const fontSize = titleSize(title);
  return createElement(
    "div",
    {
      style: {
        display: "flex",
        flexWrap: "wrap",
        maxHeight: fontSize * TITLE_LINE_HEIGHT * TITLE_LINES,
        overflow: "hidden",
        fontSize,
        fontWeight: BOLD,
        lineHeight: TITLE_LINE_HEIGHT,
      },
    },
    ...pipe(phrases.parse(title), Arr.map(phrase)),
  );
};

const titleText = (card: Card): ReactNode =>
  createElement(
    "div",
    { style: { display: "flex", flexGrow: 1, alignItems: "center" } },
    phraseLines(card.title),
  );

const byline = (avatar: string): ReactNode =>
  createElement(
    "div",
    { style: { display: "flex", alignItems: "center", gap: 20 } },
    avatarImage(avatar, sizes.avatar),
    createElement(
      "div",
      { style: { display: "flex", fontSize: sizes.author, fontWeight: BOLD } },
      site.name,
    ),
    createElement(
      "div",
      { style: { display: "flex", marginLeft: "auto", fontSize: sizes.host, color: colors.muted } },
      new URL(site.url).host,
    ),
  );

const glassPanel = (...children: readonly ReactNode[]): ReactNode =>
  createElement(
    "div",
    {
      style: {
        display: "flex",
        flexDirection: "column",
        flexGrow: 1,
        margin: sizes.stageMargin,
        padding: "48px 64px",
        borderRadius: sizes.cardRadius,
        backgroundColor: colors.glass,
        border: `1px solid ${colors.ring}`,
        boxShadow: `0 24px 64px ${colors.shadow}`,
      },
    },
    ...children,
  );

const cardElement =
  (avatar: string) =>
  (card: Card): ReactNode =>
    stage(
      glassPanel(
        tracked(categoryMeta[card.category].title, sizes.label),
        titleText(card),
        byline(avatar),
      ),
    );

const sectionTitles = pipe(
  categories,
  Arr.map((category) => categoryMeta[category].title),
  Arr.join(SECTION_SEPARATOR),
);

const siteName = createElement(
  "div",
  {
    style: {
      display: "flex",
      fontSize: sizes.siteName,
      fontWeight: BOLD,
      letterSpacing: "-0.02em",
    },
  },
  site.name,
);

const siteColumn = (avatar: string): ReactNode =>
  createElement(
    "div",
    {
      style: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: sizes.siteGap,
        flexGrow: 1,
      },
    },
    avatarImage(avatar, sizes.siteAvatar),
    siteName,
    tracked(sectionTitles, sizes.sections),
  );

const siteElement = (avatar: string): ReactNode => stage(siteColumn(avatar));

export type { Card };
export { BOLD, JAPANESE, LATIN, REGULAR, cardElement, siteElement };
