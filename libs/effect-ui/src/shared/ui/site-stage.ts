import type { View } from "@effect/ui";
import type { Html } from "@effect/ui/html";

import type { HtmlElement } from "#/shared/lib/element-types.ts";
import { FollowViewportPointer } from "#/shared/lib/pointer-mounts.ts";

import { Backdrop } from "./backdrop.ts";

const POINTER_FOLLOWER = FollowViewportPointer();

/** @stability experimental */
export const SiteStage = <Msg>({
  html,
  children,
}: Readonly<{ html: Html.H<Msg>; children: View.Children<Msg, never> }>): HtmlElement<Msg, "div"> =>
  html.div
    .class("stage relative isolate flex min-h-dvh flex-col")
    .onMount(POINTER_FOLLOWER)
    .children(
      html.div
        .class("stage fixed inset-0 -z-10")
        .attr("data-stage-layer", "")
        .children(Backdrop(html)),
      children,
    );
