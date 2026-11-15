import type { PortalResult } from "./result.ts";

export interface WatashiPortalRpc extends Rpc.WorkerEntrypointBranded {
  lifeRead: (input: unknown) => Promise<PortalResult>;
  memoryRead: (input: unknown) => Promise<PortalResult>;
  memoryWrite: (input: unknown) => Promise<PortalResult>;
  memoryProjects: () => Promise<PortalResult>;
  profile: (input: unknown) => Promise<PortalResult>;
  conversationRead: (input: unknown) => Promise<PortalResult>;
}

export const PORTAL_ACTOR = "portal";
