import type { Html } from "@effect/ui/html";
import type { HtmlElement } from "@masseater.dev/effect-ui";

import { AppRoute } from "#/shared/config/index.ts";

/** @stability experimental */
export const PageLink = <Msg>({
  html,
  route,
}: Readonly<{ html: Html.H<Msg>; route: typeof AppRoute.Type }>): HtmlElement<Msg, "a"> =>
  html.a.class("text-sm underline underline-offset-4").attr("href", AppRoute.print(route));
