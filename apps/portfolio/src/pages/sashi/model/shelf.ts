import { kindLabels } from "@masseater.dev/sashi";
import type { Reference } from "@masseater.dev/sashi";
import { Array as Arr, Option, pipe } from "effect";

export type Item = Readonly<{
  slug: string;
  title: string;
  note: string;
  tags: readonly string[];
  link: Option.Option<string>;
  facts: readonly string[];
}>;

const hostOf = (url: string): string => new URL(url).host;

const itemOf = ({ slug, title, kind, url, at, note }: Reference): Item => ({
  slug,
  title,
  note,
  tags: [kindLabels[kind]],
  link: Option.fromNullishOr(url),
  facts: Arr.getSomes([
    Option.fromNullishOr(at),
    pipe(Option.fromNullishOr(url), Option.map(hostOf)),
  ]),
});

export const shelfOf = (references: readonly Reference[]): readonly Item[] =>
  pipe(references, Arr.map(itemOf));
