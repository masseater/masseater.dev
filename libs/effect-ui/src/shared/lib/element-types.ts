import type { Html } from "@effect/ui/html";

/** @stability experimental */
export type HtmlElement<Msg, Tag extends Html.ContainerTag> = Html.Element<
  Msg,
  never,
  Html.EventsOf<Tag>,
  HTMLElementTagNameMap[Tag],
  Tag
>;

/** @stability experimental */
export type SvgIconElement<Msg> = Html.SvgElement<Msg, never, SVGSVGElement, "svg">;

/** @stability experimental */
export type VoidHtmlElement<Msg, Tag extends Html.VoidTag> = Html.VoidElement<
  Msg,
  never,
  Html.EventsOf<Tag>,
  HTMLElementTagNameMap[Tag],
  Tag
>;
