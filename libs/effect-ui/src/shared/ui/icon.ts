import type { Html } from "@effect/ui/html";
import { Array as Arr, Match, Record as Rec, Result, pipe } from "effect";
import type { IconNode } from "lucide";

import type { SvgIconElement } from "#/shared/lib/element-types.ts";

const ICON_SIZE = "24";

const SVG_ATTRIBUTES = {
  viewBox: `0 0 ${ICON_SIZE} ${ICON_SIZE}`,
  fill: "none",
  stroke: "currentColor",
  "stroke-width": "2",
  "stroke-linecap": "round",
  "stroke-linejoin": "round",
  "aria-hidden": "true",
} as const;

const attributesOf = (
  attrs: Readonly<Record<string, string | number | undefined>>,
): Readonly<Record<string, string>> =>
  Rec.filterMap(attrs, (value) =>
    pipe(
      Result.fromNullishOr(value, () => value),
      Result.map(String),
    ),
  );

/** @stability experimental */
export const Icon = <Msg>({
  html,
  node,
}: Readonly<{ html: Html.H<Msg>; node: IconNode }>): SvgIconElement<Msg> =>
  html.svg
    .class("size-4 shrink-0")
    .attrs(SVG_ATTRIBUTES)
    .children(
      pipe(
        node,
        Arr.map(([tag, attrs]) =>
          Match.value(tag).pipe(
            Match.when("circle", () => html.circle.attrs(attributesOf(attrs))),
            Match.orElse(() => html.path.attrs(attributesOf(attrs))),
          ),
        ),
      ),
    );
