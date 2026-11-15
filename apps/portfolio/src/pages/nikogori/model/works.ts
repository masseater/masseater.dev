import { sectionPath, site } from "#/shared/config/index.ts";

export type Work = Readonly<{ slug: string; title: string; width: number; height: number }>;

export const works: readonly Work[] = [
  { slug: "okitara-saiteita", title: "起きたら咲いていた", width: 1600, height: 900 },
  { slug: "hikari-no-henji", title: "ひかりの返事", width: 1600, height: 900 },
  { slug: "mada-atatakai", title: "まだ、あたたかい", width: 1600, height: 900 },
  { slug: "mada-atatakai-v2", title: "まだ、あたたかい", width: 1600, height: 900 },
];

export const workPath = ({ slug }: Work): string =>
  `${site.url}${sectionPath("nikogori")}/${slug}/`;

export const thumbnailPath = (work: Work): string => `${workPath(work)}thumb.webp`;
