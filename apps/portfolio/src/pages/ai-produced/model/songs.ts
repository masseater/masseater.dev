import { sectionPath, site } from "#/shared/config/index.ts";

export type Song = Readonly<{
  slug: string;
  title: string;
  style: string;
  tempo: number;
  length: string;
}>;

export const THUMBNAIL = { width: 1600, height: 900 } as const;

export const songs: readonly Song[] = [
  {
    slug: "kuraku-narikake",
    title: "暗くなりかけ",
    style: "liquid funk",
    tempo: 175,
    length: "4:57",
  },
  {
    slug: "life-is-but-a",
    title: "life is but a",
    style: "speed garage",
    tempo: 160,
    length: "2:01",
  },
];

export const factsOf = ({ style, tempo, length }: Song): string =>
  `${style} · ${tempo} BPM · ${length}`;

export const songPath = ({ slug }: Song): string =>
  `${site.url}${sectionPath("ai-produced")}/${slug}/`;

export const thumbnailPath = (song: Song): string => `${songPath(song)}thumb.webp`;
