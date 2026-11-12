const ACCESS_SITES = [
  "personal.masseater.dev",
  "kikite.masseater.dev",
  "translate.masseater.dev",
] as const;

const ACCESS_TEAM_ORIGIN = "https://masseater.cloudflareaccess.com";

type AccessSite = (typeof ACCESS_SITES)[number];

export { ACCESS_SITES, ACCESS_TEAM_ORIGIN };
export type { AccessSite };
