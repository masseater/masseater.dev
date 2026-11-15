export type CredentialState = Readonly<{
  id: string;
  kind: "key" | "login";
  status: "stored" | "missing";
  actionUrl: string;
}>;

export interface CredentialStatusRpc extends Rpc.WorkerEntrypointBranded {
  list: () => Promise<readonly CredentialState[]>;
}
