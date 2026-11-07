import type { FileSystem } from "effect";
import { Effect, Option } from "effect";

import { hasExtension, kindOf } from "#entities/package";
import { blendPreview } from "#shared/blend";
import { imagePreview } from "#shared/preview";

import { plainAsset } from "./insert-assets.ts";
import type { AssetInput } from "./insert-assets.ts";
import type { Member } from "./loose-files.ts";

const BLEND_EXTENSION = ".blend";

interface Preview {
  readonly previews: readonly Uint8Array[];
  readonly render: boolean;
}

const NO_PREVIEW: Preview = { previews: [], render: false };

const isBlend = hasExtension(BLEND_EXTENSION);

const previewOf = ({
  pathname,
  file,
}: Member): Effect.Effect<Preview, never, FileSystem.FileSystem> => {
  const kind = kindOf(pathname);
  if (kind === "texture") {
    return imagePreview(file).pipe(
      Effect.map((png): Preview => ({ previews: [png], render: false })),
      Effect.catchCause((cause) =>
        Effect.logDebug("no image preview", file, cause).pipe(Effect.as(NO_PREVIEW)),
      ),
    );
  }
  if (kind !== "model") {
    return Effect.succeed(NO_PREVIEW);
  }
  if (!isBlend(pathname)) {
    return Effect.succeed({ previews: [], render: true });
  }
  return blendPreview(file).pipe(
    Effect.map((png): Preview => ({ previews: Option.toArray(png), render: false })),
    Effect.catchCause((cause) =>
      Effect.logDebug("no blend thumbnail", file, cause).pipe(Effect.as(NO_PREVIEW)),
    ),
  );
};

/** @internal */
const looseAsset = Effect.fn("looseAsset")(function* looseAsset(member: Member) {
  const { previews, render } = yield* previewOf(member);
  return {
    ...plainAsset({ guid: member.pathname, pathname: member.pathname, previews }),
    file: Option.some(member.file),
    render,
  } satisfies AssetInput;
});

export { looseAsset };
