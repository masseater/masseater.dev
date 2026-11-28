import type { Html } from "@effect/ui/html";
import { portfolio } from "@masseater.dev/ui/portfolio";
import { toWavyLetters } from "@masseater.dev/ui/to-wavy-letters";
import type { WavyLetter } from "@masseater.dev/ui/to-wavy-letters";
import { Array as Arr, Record as Rec, String as Str, pipe } from "effect";

import type { HtmlElement } from "#/shared/lib/element-types.ts";
import { FollowPointer } from "#/shared/lib/pointer-mounts.ts";

const LETTERS = toWavyLetters(portfolio.name);

const POINTER_FOLLOWER = FollowPointer();

type Link = Readonly<{ label: string; href: string }>;

const Letter = <Msg>(
  html: Html.H<Msg>,
  { key, letter, style }: WavyLetter,
): HtmlElement<Msg, "span"> =>
  html.span
    .key(key)
    .class("stage-letter inline-block")
    .attr("aria-hidden", "true")
    .style({ "--i": String(style["--i"]) })
    .children(letter);

const Logo = <Msg>(html: Html.H<Msg>): HtmlElement<Msg, "a"> =>
  html.a
    .class(
      "stage vt-site-name font-display inline-block shrink-0 text-3xl whitespace-nowrap select-none",
    )
    .attrs({ "aria-label": portfolio.name, href: `${portfolio.url}/` })
    .style({ "--n": String(portfolio.name.length) })
    .onMount(POINTER_FOLLOWER)
    .children(
      pipe(
        LETTERS,
        Arr.map((letter) => Letter(html, letter)),
      ),
    );

const SocialLink = <Msg>(html: Html.H<Msg>, { label, href }: Link): HtmlElement<Msg, "li"> =>
  html.li.key(href).children(
    html.a
      .class("stage-link px-2 py-3")
      .attrs({ href })
      .style({ viewTransitionName: `social-${Str.toLowerCase(label)}` })
      .children(label),
  );

const SectionLink = <Msg>(
  html: Html.H<Msg>,
  [category, title]: readonly [string, string],
): HtmlElement<Msg, "li"> =>
  html.li.key(category).children(
    html.a
      .class("stage-link px-2 py-3")
      .attrs({ href: `${portfolio.url}/${category}/` })
      .children(html.span.style({ viewTransitionName: `category-${category}` }).children(title)),
  );

const SocialLinks = <Msg>(html: Html.H<Msg>): HtmlElement<Msg, "ul"> =>
  html.ul
    .class("flex justify-end sm:gap-x-4")
    .attr("role", "list")
    .children(
      pipe(
        portfolio.links,
        Arr.map((link) => SocialLink(html, link)),
      ),
    );

const SectionLinks = <Msg>(html: Html.H<Msg>): HtmlElement<Msg, "nav"> => {
  const sections = pipe(
    Rec.toEntries(portfolio.sections),
    Arr.map((section) => SectionLink(html, section)),
  );
  return html.nav
    .attr("aria-label", portfolio.name)
    .children(html.ul.class("flex flex-wrap justify-center gap-x-4").children(sections));
};

/** @stability experimental */
export const PortfolioHeader = <Msg>(html: Html.H<Msg>): HtmlElement<Msg, "header"> =>
  html.header
    .class("flex flex-col items-center gap-6 px-6 pt-8")
    .children(
      html.div
        .class("flex w-full flex-wrap items-center justify-between gap-x-4 gap-y-2")
        .children(Logo(html), SocialLinks(html)),
      SectionLinks(html),
    );
