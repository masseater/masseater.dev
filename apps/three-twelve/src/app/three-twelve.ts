import { runner } from "@r_masseater/workers-tracing/effect";
import { DurableObject } from "cloudflare:workers";
import type { env as workerEnv } from "cloudflare:workers";
import { Effect, Logger, Option } from "effect";

import {
  alarmed,
  arm,
  isStoredToken,
  lastRun,
  storeToken,
} from "#/features/perform-alarm/index.ts";

import { Stage, respond, schedule } from "./routes.ts";

const logger = Logger.layer([Logger.withLeveledConsole(Logger.formatStructured)]);
const runLogged = runner(logger);

export class Player extends DurableObject {
  public setToken(token: string): Promise<void> {
    return runLogged(storeToken(this.ctx.storage, token));
  }

  public isToken(token: string): Promise<boolean> {
    return runLogged(isStoredToken(this.ctx.storage, token));
  }

  public arm(startAt: number): Promise<void> {
    return runLogged(arm(this.ctx.storage, startAt));
  }

  public lastRun(): Promise<unknown> {
    return runLogged(lastRun(this.ctx.storage).pipe(Effect.map(Option.getOrNull)));
  }

  public override alarm(): Promise<void> {
    return runLogged(alarmed(this.ctx, this.env.AUDIO));
  }
}

const worker: ExportedHandler<typeof workerEnv> = {
  fetch: (request, env) => {
    const stage = {
      player: env.PLAYER.getByName("player"),
      audio: env.AUDIO,
      limiter: env.LIMITER,
    };
    return runLogged(respond(request).pipe(Effect.provideService(Stage, stage)));
  },
  scheduled: (_controller, env) => {
    const stage = {
      player: env.PLAYER.getByName("player"),
      audio: env.AUDIO,
      limiter: env.LIMITER,
    };
    return runLogged(schedule().pipe(Effect.provideService(Stage, stage)));
  },
};

export default worker;
