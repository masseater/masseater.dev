import type { LiveMix, Rendered } from "@masseater.dev/daw-view";
import { Option } from "effect";

export const withLive =
  (mixdown: Rendered) =>
  (live: Option.Option<LiveMix>): Rendered =>
    Option.match(live, {
      onNone: () => mixdown,
      onSome: (given) => ({
        left: mixdown.left,
        right: mixdown.right,
        take: mixdown.take,
        live: given,
      }),
    });
