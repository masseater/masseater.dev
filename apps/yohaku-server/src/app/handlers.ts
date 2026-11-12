import { YohakuRpcs } from "@masseater.dev/yohaku-protocol";
import type { Reaction } from "@masseater.dev/yohaku-protocol";
import { Effect } from "effect";

import { annotations, dismissRemark } from "./annotation-handlers.ts";
import { manuscriptHandlers } from "./manuscript-handlers.ts";
import { logReaction } from "./reactions.ts";
import { failed } from "./request-failed.ts";
import { sourceHandlers } from "./source-handlers.ts";
import { writingHandlers } from "./writing-handlers.ts";

const DISMISSED: typeof Reaction.Type = "remark-dismissed";

interface Dismissal {
  readonly id: string;
  readonly paragraphId: string;
  readonly rule: string;
}

const dismissed = Effect.fn("dismissed")(function* dismissed(target: Dismissal) {
  yield* failed(dismissRemark(target));
  yield* failed(logReaction(DISMISSED));
});

/** @internal */
const handlersLayer = YohakuRpcs.toLayer(
  Effect.succeed(
    YohakuRpcs.of({
      ...manuscriptHandlers,
      ...sourceHandlers,
      ...writingHandlers,
      GetAnnotations: ({ id }) => failed(annotations(id)),
      DismissRemark: dismissed,
      LogReaction: ({ reaction }) => failed(logReaction(reaction)),
    }),
  ),
);

export { handlersLayer };
