import type { PortalResult } from "./result.ts";

export interface MoneyPortalRpc extends Rpc.WorkerEntrypointBranded {
  read: (tool: string, input: unknown) => Promise<PortalResult>;
}
