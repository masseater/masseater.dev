import { Containers, R2, Workers } from "@alchemy.run/cloudflare";
import { tracedStackProps } from "@masseater.dev/cloudflare-account/traced-providers";
import davey from "@snazzah/davey/package.json" with { type: "json" };
import { RemovalPolicy, Stack } from "alchemy";
import { Build } from "alchemy/Command";
import { Effect } from "effect";

import { APP_NAME, PREFIX, requireAppPrefix } from "./src/shared/config/app-name.ts";
import { BASE_PATH, CRON, PLAYER_IMAGE, ZONE } from "./src/shared/config/three-twelve.ts";

const PlayerImage = Containers.Container(
  PLAYER_IMAGE,
  Effect.gen(function* playerImage() {
    const { outdir } = yield* Build("PlayerBundle", {
      command: "vp pack",
      outdir: "dist/player",
      memo: {
        include: [
          "src/app/player/**",
          "src/features/play-voice/**",
          "src/entities/outcome/**",
          "src/shared/config/**",
          "*.ts",
          "package.json",
        ],
        exclude: ["**/*.test.ts", "alchemy.run.ts"],
      },
    });
    return {
      schedulingPolicy: "durable_object" as const,
      context: outdir,
      build: { args: { DAVEY_VERSION: davey.version } },
    };
  }),
);

export default Stack(
  APP_NAME,
  tracedStackProps,
  Effect.gen(function* stack() {
    const AUDIO = yield* R2.Bucket("Audio", { name: `${PREFIX}audio` }).pipe(
      RemovalPolicy.protect(),
    );
    const { url } = yield* Workers.Worker("ThreeTwelve", {
      name: `${PREFIX}worker`,
      main: "./src/app/worker/three-twelve.worker.ts",
      logpush: true,
      crons: [CRON],
      routes: [{ pattern: `${ZONE}${BASE_PATH}/*`, zoneName: ZONE }],
      env: {
        PLAYER: Workers.DurableObject("Player", { containers: [PlayerImage] }),
        AUDIO,
      },
    });
    yield* requireAppPrefix;
    return { url };
  }),
);
