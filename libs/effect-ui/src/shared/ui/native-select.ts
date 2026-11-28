import type { Html } from "@effect/ui/html";
import { NATIVE_SELECT_CLASS } from "@masseater.dev/ui/native-select-class";

import type { HtmlElement } from "#/shared/lib/element-types.ts";

/** @stability experimental */
export const NativeSelect = <Msg>(html: Html.H<Msg>): HtmlElement<Msg, "select"> =>
  html.select.class(NATIVE_SELECT_CLASS).attr("data-slot", "native-select");
