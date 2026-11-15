import type { PortalResult } from "./result.ts";

interface MoneyPortalRpc extends Rpc.WorkerEntrypointBranded {
  read: (tool: string, input: unknown) => Promise<PortalResult>;
}

export type { MoneyPortalRpc };
