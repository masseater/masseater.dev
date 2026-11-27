import { Array as Arr, Console, Effect, pipe } from "effect";
import { Argument, Command } from "effect/cli";

import { checkVideo } from "#/features/check-video/index.ts";
import { fetchAssets } from "#/features/fetch-assets/index.ts";
import { narrate } from "#/features/narrate-script/index.ts";
import { renderReview, renderVideo } from "#/features/render-video/index.ts";
import { createVideo } from "#/features/scaffold-video/index.ts";

import { report } from "./report.ts";

const slug = Argument.String("slug");
const NEWLINE = "\n";

const printAll = (lines: readonly string[]): Effect.Effect<void> =>
  Console.log(pipe(lines, Arr.join(NEWLINE)));

const checked = (value: string): ReturnType<typeof checkVideo> =>
  checkVideo(value).pipe(Effect.tap(report));

const newCommand = Command.make("new", { slug }, ({ slug: value }) =>
  createVideo(value).pipe(Effect.flatMap(printAll)),
);

const checkCommand = Command.make("check", { slug }, ({ slug: value }) => checked(value));

const voiceCommand = Command.make("voice", { slug }, ({ slug: value }) =>
  narrate(value).pipe(
    Effect.flatMap(({ made, kept }) =>
      Console.log(`ナレーション: ${String(made)} 行を作り、${String(kept)} 行を使い回した`),
    ),
  ),
);

const assetsCommand = Command.make("assets", { slug }, ({ slug: value }) =>
  fetchAssets(value).pipe(Effect.flatMap(printAll)),
);

const reviewCommand = Command.make("review", { slug }, ({ slug: value }) =>
  checked(value).pipe(
    Effect.flatMap(({ timelines }) => renderReview({ slug: value, timelines })),
    Effect.flatMap(printAll),
  ),
);

const makeCommand = Command.make("make", { slug }, ({ slug: value }) =>
  fetchAssets(value).pipe(
    Effect.andThen(narrate(value)),
    Effect.andThen(checked(value)),
    Effect.flatMap(({ timelines }) => renderReview({ slug: value, timelines })),
    Effect.flatMap(printAll),
  ),
);

const renderCommand = Command.make("render", { slug }, ({ slug: value }) =>
  checked(value).pipe(
    Effect.flatMap(({ timelines }) => renderVideo({ slug: value, timelines })),
    Effect.flatMap(printAll),
  ),
);

/** @internal */
export const cli = Command.make("videos").pipe(
  Command.withSubcommands([
    newCommand,
    makeCommand,
    checkCommand,
    voiceCommand,
    assetsCommand,
    reviewCommand,
    renderCommand,
  ]),
);
