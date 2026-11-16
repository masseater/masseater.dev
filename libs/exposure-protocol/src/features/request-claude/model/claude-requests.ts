export type ClaudeRequest = Readonly<{ text: string; sender: string }>;

export interface ClaudeRequestsRpc extends Rpc.WorkerEntrypointBranded {
  send: (request: ClaudeRequest) => Promise<Readonly<{ id: number; woke: string }>>;
}
