import { Effect, Option } from "effect";

import { embedImages } from "./embed-images.ts";
import type { AnalyzedBatch } from "./embed-images.ts";
import { embedTexts } from "./embed-texts.ts";
import { scanFolders } from "./scan-folders.ts";
import type { ScannedFile } from "./scan-folders.ts";

type Activity =
  | { readonly status: "idle" }
  | { readonly status: "scanning"; readonly file: ScannedFile }
  | { readonly status: "analyzing"; readonly batch: Option.Option<AnalyzedBatch> };

/** @internal */
const scanLibrary = Effect.fn("scanLibrary")(function* scanWholeLibrary<
  Failure,
  Requirements,
  LinkableRequirements,
>({
  blm,
  report,
}: {
  readonly blm: {
    readonly link: Effect.Effect<void, Failure, Requirements>;
    readonly linkable: Effect.Effect<(packagePath: string) => boolean, never, LinkableRequirements>;
  };
  readonly report: (activity: Activity) => Effect.Effect<void>;
}) {
  const linkable = yield* blm.linkable;
  yield* scanFolders((file) => report({ status: "scanning", file }), linkable);
  yield* blm.link;
  yield* embedTexts(Option.none()).pipe(
    Effect.catchCause((cause) => Effect.logWarning("text embedding failed", cause)),
  );
  yield* report({ status: "analyzing", batch: Option.none() });
  yield* embedImages((batch) => report({ status: "analyzing", batch: Option.some(batch) }));
});

export { scanLibrary };
export type { Activity };
