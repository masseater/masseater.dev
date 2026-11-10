const ACCESS_SITES = ["personal.masseater.dev"] as const;

type AccessSite = (typeof ACCESS_SITES)[number];

export { ACCESS_SITES };
export type { AccessSite };
