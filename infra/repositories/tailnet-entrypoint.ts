import { runner } from "@r_masseater/workers-tracing/effect";
import { WorkerEntrypoint } from "cloudflare:workers";
import { Logger } from "effect";

import { joinTailnet } from "./tailnet-join.ts";
import type { JoinedTailnet, TailnetEnv } from "./tailnet-join.ts";

interface TailnetRpc extends Rpc.WorkerEntrypointBranded {
  join: (publicKey: unknown) => Promise<JoinedTailnet>;
}

const logger = Logger.layer([Logger.withLeveledConsole(Logger.formatStructured)]);

class Tailnet extends WorkerEntrypoint<TailnetEnv> implements TailnetRpc {
  public join(publicKey: unknown): Promise<JoinedTailnet> {
    return runner(logger)(joinTailnet(publicKey)(this.env));
  }
}

export { Tailnet };
export type { TailnetRpc };
