import { Array as Arr, pipe } from "effect";

import {
  CC_BY_URL,
  GOOGLE_PRIVACY_URL,
  NICO_SNAPSHOT_URL,
  SOURCE_URL,
  VOCADB_URL,
  YOUTUBE_TERMS_URL,
} from "#/shared/config";

type Segment = Readonly<{ text: string; href?: string }>;

interface AboutSection {
  readonly title: string;
  readonly paragraphs: readonly (readonly Segment[])[];
}

const TEXT = {
  title: "nimado について",
  back: "ランキング",
} as const;

const SECTIONS: readonly AboutSection[] = [
  {
    title: "データ",
    paragraphs: [
      [
        { text: "曲と動画の対応は " },
        { text: "VocaDB", href: VOCADB_URL },
        { text: " のデータ（" },
        { text: "CC BY 4.0", href: CC_BY_URL },
        { text: "）を使っている。" },
      ],
      [
        { text: "ニコニコ動画の再生数は " },
        { text: "ニコニコ動画 スナップショット検索 API", href: NICO_SNAPSHOT_URL },
        {
          text: " から、YouTube の再生数は YouTube API Services（YouTube Data API）から毎朝取得している。ニコニコ動画の再生数は YouTube から得た値ではない。",
        },
      ],
      [
        {
          text: "曲ごとの値は、その曲の動画のうち再生数がいちばん多いものである。YouTube の値は 30 日を超えて保存しない。",
        },
      ],
    ],
  },
  {
    title: "YouTube API Services",
    paragraphs: [
      [
        {
          text: "このサイトは YouTube API Services を使っている。YouTube のデータを含むページを見ることで、",
        },
        { text: "YouTube 利用規約", href: YOUTUBE_TERMS_URL },
        { text: "に同意したものとみなされる。" },
      ],
    ],
  },
  {
    title: "プライバシー",
    paragraphs: [
      [
        {
          text: "このサイトは Cookie を使わず、見た人の情報を YouTube にも Google にも送らない。アクセス数は Cookie を使わない Cloudflare Web Analytics で数えている。YouTube API Services が扱うデータについては ",
        },
        { text: "Google プライバシー ポリシー", href: GOOGLE_PRIVACY_URL },
        { text: " を参照のこと。" },
      ],
    ],
  },
  {
    title: "ソースコード",
    paragraphs: [[{ text: "GitHub", href: SOURCE_URL }]],
  },
];

const paragraphKey = (segments: readonly Segment[]): string =>
  pipe(
    segments,
    Arr.map(({ text }) => text),
    Arr.join(""),
  );

export type { AboutSection, Segment };

export { SECTIONS, TEXT, paragraphKey };
