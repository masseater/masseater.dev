import { Containers, Workers } from "@alchemy.run/cloudflare";
import { ownerAccess } from "@masseater.dev/cloudflare-account/owner-access";
import { tracedStackProps } from "@masseater.dev/cloudflare-account/traced-providers";
import { Stack } from "alchemy";
import { Effect } from "effect";

import { APP_NAME, PREFIX, requireAppPrefix } from "./app-name.ts";
import { HOST, MODEL_IMAGE } from "./config.ts";

const PlamoImage = Containers.Container(MODEL_IMAGE, {
  schedulingPolicy: "durable_object",
  context: "container",
});

export default Stack(
  APP_NAME,
  tracedStackProps,
  Effect.gen(function* stack() {
    yield* ownerAccess({
      id: "TranslateAccess",
      name: `${PREFIX}access`,
      host: HOST,
      loopbackClients: false,
    });
    const { url } = yield* Workers.Worker("Translate", {
      name: `${PREFIX}worker`,
      main: "./translator.worker.ts",
      logpush: true,
      domain: HOST,
      workersDev: false,
      env: { MODEL: Workers.DurableObject("PlamoModel", { containers: [PlamoImage] }) },
    });
    yield* requireAppPrefix;
    return { url };
  }),
);
