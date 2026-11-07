import { Containers, R2, Workers, providers, state } from "@alchemy.run/cloudflare";
import { withWorkersTracing } from "@r_masseater/workers-tracing/alchemy";
import davey from "@snazzah/davey/package.json" with { type: "json" };
import { Stack } from "alchemy";
import { Build } from "alchemy/Command";
import { Effect } from "effect";

import { APP_NAME, PREFIX, TRACE_DESTINATION, requireAppPrefix } from "./app-name.ts";
import { BASE_PATH, CRON, PLAYER_IMAGE, ZONE } from "./three-twelve.ts";

const PlayerImage = Containers.Container(
  PLAYER_IMAGE,
  Effect.gen(function* playerImage() {
    const { outdir } = yield* Build("PlayerBundle", {
      command: "vp pack",
      outdir: "dist/player",
      memo: {
        include: ["player/**", "*.ts", "package.json"],
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
  {
    providers: withWorkersTracing({ destinations: [TRACE_DESTINATION] })(providers()),
    state: state(),
  },
  Effect.gen(function* stack() {
    const AUDIO = yield* R2.Bucket("Audio", { name: `${PREFIX}audio` });
    const { url } = yield* Workers.Worker("ThreeTwelve", {
      name: `${PREFIX}worker`,
      main: "./worker/three-twelve.worker.ts",
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
