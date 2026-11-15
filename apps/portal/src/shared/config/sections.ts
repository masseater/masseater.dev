type PortalPath =
  | "/"
  | "/records"
  | "/memos"
  | "/profile"
  | "/conversations"
  | "/money"
  | "/slides"
  | "/credentials";

const SECTIONS = [
  { label: "Watashi", to: "/", routeId: "/_watashi" },
  { label: "Money", to: "/money", routeId: "/money" },
  { label: "Slides", to: "/slides", routeId: "/slides" },
  { label: "Credentials", to: "/credentials", routeId: "/credentials" },
] as const;

export { SECTIONS };
export type { PortalPath };
