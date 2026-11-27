import { Containers, Workers } from "@alchemy.run/cloudflare";
import { japanBucket } from "@masseater.dev/cloudflare-account/japan-bucket";
import { tracedStackProps } from "@masseater.dev/cloudflare-account/traced-providers";
import davey from "@snazzah/davey/package.json" with { type: "json" };
import { Stack } from "alchemy";
import { Build } from "alchemy/Command";
import { Effect, Hash, Option } from "effect";

import { APP_NAME, PREFIX, requireAppPrefix } from "./src/shared/config/app-name.ts";
import { BASE_PATH, CRON, PLAYER_IMAGE, ZONE } from "./src/shared/config/three-twelve.ts";

const BUNDLE_DIR = "dist/player";

const REQUESTS_PER_MINUTE = 30;

const LIMITER = Workers.RateLimit("LIMITER", {
  namespaceId: Math.abs(Hash.string(APP_NAME)),
  simple: { limit: REQUESTS_PER_MINUTE, period: 60 },
});

const PlayerImage = Containers.Container(
  PLAYER_IMAGE,
  Effect.gen(function* playerImage() {
    const { outdir } = yield* Build("PlayerBundle", {
      command: "vp pack",
      outdir: BUNDLE_DIR,
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
      dockerfile: `${BUNDLE_DIR}/Containerfile`,
      build: { args: { DAVEY_VERSION: davey.version } },
    };
  }),
);

export default Stack(
  APP_NAME,
  tracedStackProps,
  Effect.gen(function* stack() {
    const AUDIO = yield* japanBucket("Audio", {
      name: `${PREFIX}audio`,
      lifecycleRules: Option.none(),
    });
    const { url } = yield* Workers.Worker("ThreeTwelve", {
      limits: { cpuMs: 200 },
      name: `${PREFIX}worker`,
      main: "./src/app/three-twelve.ts",
      logpush: true,
      workersDev: false,
      crons: [CRON],
      routes: [{ pattern: `${ZONE}${BASE_PATH}/*`, zoneName: ZONE }],
      env: {
        PLAYER: Workers.DurableObject("Player", { containers: [PlayerImage] }),
        AUDIO,
        LIMITER,
      },
    });
    yield* requireAppPrefix;
    return { url };
  }),
);
