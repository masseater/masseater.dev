import type { Html } from "@effect/ui/html";
import type { VoidHtmlElement } from "@masseater.dev/effect-ui";

import type { Picture } from "#/entities/extraction/index.ts";

/** @stability experimental */
export const PicturePreview = <Msg>({
  html,
  picture,
}: Readonly<{ html: Html.H<Msg>; picture: Picture }>): VoidHtmlElement<Msg, "img"> =>
  html.img.class("max-h-120 w-fit rounded border").attrs({ src: picture.url, alt: picture.name });
