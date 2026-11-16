export type PortalResult =
  | Readonly<{ status: "ok"; body: unknown }>
  | Readonly<{ status: "failed"; errorTag: string; text: string }>;
