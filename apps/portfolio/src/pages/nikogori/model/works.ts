import { sectionPath, site } from "#/shared/config";

type Work = Readonly<{ slug: string; title: string; width: number; height: number }>;

const works: readonly Work[] = [
  { slug: "okitara-saiteita", title: "起きたら咲いていた", width: 1600, height: 900 },
  { slug: "hikari-no-henji", title: "ひかりの返事", width: 1600, height: 900 },
  { slug: "mada-atatakai", title: "まだ、あたたかい", width: 1600, height: 900 },
  { slug: "mada-atatakai-v2", title: "まだ、あたたかい", width: 1600, height: 900 },
];

const workPath = ({ slug }: Work): string => `${site.url}${sectionPath("nikogori")}/${slug}/`;

const thumbnailPath = (work: Work): string => `${workPath(work)}thumb.webp`;

export type { Work };
export { thumbnailPath, workPath, works };
