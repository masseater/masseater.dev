import type { Html } from "@effect/ui/html";
import { NativeSelect } from "@masseater.dev/effect-ui";
import type { HtmlElement } from "@masseater.dev/effect-ui";
import { Array as Arr, pipe } from "effect";

import { WAYS } from "#/entities/extraction/index.ts";
import { COPY } from "#/shared/config/index.ts";

/** @stability experimental */
export const WayField = <Msg>({
  html,
  way,
  onChange,
}: Readonly<{
  html: Html.H<Msg>;
  way: string;
  onChange: (way: string) => Msg;
}>): HtmlElement<Msg, "select"> =>
  NativeSelect(html)
    .attr("aria-label", COPY.way)
    .value(way)
    .on("change", ({ value }) => onChange(value))
    .children(
      pipe(
        WAYS,
        Arr.map(({ key, label }) => html.option.key(key).attr("value", key).children(label)),
      ),
    );
