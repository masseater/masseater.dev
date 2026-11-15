export type PortalPath =
  | "/"
  | "/records"
  | "/memos"
  | "/profile"
  | "/conversations"
  | "/money"
  | "/slides"
  | "/credentials";

export const SECTIONS = [
  { label: "Watashi", to: "/", routeId: "/_watashi" },
  { label: "Money", to: "/money", routeId: "/money" },
  { label: "Slides", to: "/slides", routeId: "/slides" },
  { label: "Credentials", to: "/credentials", routeId: "/credentials" },
] as const;
