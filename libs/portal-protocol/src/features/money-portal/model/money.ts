import type { PortalResult } from "#/shared/lib/result.ts";

export interface MoneyPortalRpc extends Rpc.WorkerEntrypointBranded {
  read: (tool: string, input: unknown) => Promise<PortalResult>;
}
