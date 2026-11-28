import { kindLabels } from "@masseater.dev/sashi";
import type { Kind, Reference } from "@masseater.dev/sashi";
import { Array as Arr, Option, pipe } from "effect";
import escapeHtml from "escape-html";

import { REFERENCES_FILE, SITE_DESCRIPTION, SITE_NAME } from "#/shared/config/index.ts";

export type Section = Readonly<{
  path: string;
  label: string;
  kind: Option.Option<Kind>;
}>;

const hostOf = (url: string): string => new URL(url).host;

const nameOf = ({ title, url }: Reference): string =>
  pipe(
    Option.fromNullishOr(url),
    Option.match({
      onNone: () => `<span class="name">${escapeHtml(title)}</span>`,
      onSome: (href) =>
        `<a class="name" href="${escapeHtml(href)}" rel="noopener noreferrer" target="_blank">${escapeHtml(title)}</a>`,
    }),
  );

const factsOf = ({ kind, at, url }: Reference, showKind: boolean): readonly string[] =>
  Arr.getSomes([
    pipe(
      Option.some(kindLabels[kind]),
      Option.filter(() => showKind),
    ),
    Option.fromNullishOr(at),
    pipe(Option.fromNullishOr(url), Option.map(hostOf)),
  ]);

const factsHtml = (facts: readonly string[]): string =>
  pipe(
    facts,
    Arr.map((fact) => `<span>${escapeHtml(fact)}</span>`),
    Arr.join(""),
  );

const itemHtml =
  (showKind: boolean) =>
  (reference: Reference): string =>
    `<li><div class="head">${nameOf(reference)}</div><p>${escapeHtml(reference.note)}</p><div class="facts">${factsHtml(factsOf(reference, showKind))}</div></li>`;

const linkHtml =
  (current: Section) =>
  ({ section, count }: Readonly<{ section: Section; count: number }>): string => {
    const state = pipe(
      Arr.fromOption(
        Option.liftPredicate(' aria-current="page"', () => section.path === current.path),
      ),
      Arr.join(""),
    );
    return `<li><a href="${section.path}"${state}><span>${escapeHtml(section.label)}</span><span class="count">${String(count)}</span></a></li>`;
  };

const titleOf = ({ path, label }: Section): string =>
  pipe(
    Arr.fromOption(Option.liftPredicate(label, () => path !== "/")),
    Arr.append(SITE_NAME),
    Arr.join(" · "),
  );

export const pageHtml = ({
  current,
  sections,
  references,
  counts,
}: Readonly<{
  current: Section;
  sections: readonly Section[];
  references: readonly Reference[];
  counts: readonly number[];
}>): string => {
  const links = pipe(
    Arr.zip(sections, counts),
    Arr.map(([section, count]) => linkHtml(current)({ section, count })),
    Arr.join(""),
  );
  const showKind = Option.isNone(current.kind);
  const items = pipe(references, Arr.map(itemHtml(showKind)), Arr.join(""));
  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(titleOf(current))}</title>
<meta name="description" content="${escapeHtml(SITE_DESCRIPTION)}">
<link rel="stylesheet" href="/style.css">
<link rel="alternate" type="application/json" href="/${REFERENCES_FILE}">
</head>
<body>
<header class="top"><a href="/">${SITE_NAME}</a></header>
<div class="frame">
<nav aria-label="種類"><ul>${links}</ul></nav>
<main>
<h1>${escapeHtml(current.label)}</h1>
<ul class="list">${items}</ul>
</main>
</div>
</body>
</html>
`;
};
