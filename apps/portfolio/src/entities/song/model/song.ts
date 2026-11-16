import type { Credit } from "@masseater.dev/daw-view";

export type Work = Readonly<{
  title: string;
  style: string;
  tempo: number;
  length: string;
  key: string;
  description: string;
  released: string;
  credits: readonly Credit[];
}>;

export type Song = Work &
  Readonly<{
    slug: string;
    thumbnail: string;
  }>;

export const THUMBNAIL = { width: 1600, height: 900 } as const;

export const factsOf = ({ style, tempo, length, key }: Work): readonly string[] => [
  style,
  `${tempo} BPM`,
  length,
  key,
];

export const summaryOf = ({ style, tempo, length }: Work): string =>
  `${style} · ${tempo} BPM · ${length}`;
