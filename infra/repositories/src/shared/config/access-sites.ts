export const ACCESS_SITES = [
  "personal.masseater.dev",
  "kikite.masseater.dev",
  "translate.masseater.dev",
  "yohaku.masseater.dev",
  "portal.masseater.dev",
] as const;

export const ACCESS_TEAM_ORIGIN = "https://masseater.cloudflareaccess.com";

export type AccessSite = (typeof ACCESS_SITES)[number];
