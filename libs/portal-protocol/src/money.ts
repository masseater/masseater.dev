import type { PortalResult } from "./result.ts";

export interface MoneyPortalRpc extends Rpc.WorkerEntrypointBranded {
  read: (input: unknown) => Promise<PortalResult>;
}
