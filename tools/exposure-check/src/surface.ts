import { Array as Arr, Order, String as Str, pipe } from "effect";

import type { AccessApp, Inventory } from "./inventory.ts";

export type Surface = Readonly<{
  hosts: readonly string[];
  workers: readonly string[];
  repositories: readonly string[];
}>;

export type Observed = Readonly<{ inventory: Inventory; remembered: Surface }>;

const ACCESS_TYPES: readonly string[] = ["self_hosted", "mcp_portal"];

export const WILDCARD = "*.";

export const hostOf = (destination: string): string =>
  pipe(Str.split("/")(destination), Arr.headNonEmpty, Str.toLowerCase);

const isAccessApp = (app: AccessApp): boolean => Arr.contains(ACCESS_TYPES, app.type);

export const accessApps = (inventory: Inventory): readonly AccessApp[] =>
  pipe(inventory.apps, Arr.filter(isAccessApp));

const covers =
  (destination: string) =>
  (host: string): boolean =>
    destination === host ||
    (Str.startsWith(WILDCARD)(destination) &&
      Str.endsWith(Str.replace(WILDCARD, ".")(destination))(host));

const wholeHostDestinations = (app: AccessApp): readonly string[] =>
  pipe(
    app.destinations,
    Arr.filter((destination) => !Str.includes("/")(destination)),
    Arr.map(Str.toLowerCase),
  );

const coversHost =
  (host: string) =>
  (app: AccessApp): boolean =>
    pipe(
      wholeHostDestinations(app),
      Arr.some((destination) => covers(destination)(host)),
    );

export const coveringApp =
  (inventory: Inventory) =>
  (host: string): readonly AccessApp[] =>
    pipe(accessApps(inventory), Arr.filter(coversHost(host)));

export const isCovered =
  (inventory: Inventory) =>
  (host: string): boolean =>
    Arr.isReadonlyArrayNonEmpty(coveringApp(inventory)(host));

export const routeHost = (pattern: string): string => hostOf(pattern);

const union = (...lists: readonly (readonly string[])[]): readonly string[] =>
  pipe(
    lists,
    Arr.flatten,
    Arr.dedupe,
    Arr.sortWith((item: string) => item, Order.String),
  );

const privateHosts = ({ inventory, remembered }: Observed): readonly string[] =>
  union(
    pipe(
      accessApps(inventory),
      Arr.flatMap((app) => app.destinations),
      Arr.map(hostOf),
    ),
    remembered.hosts,
  );

const privateWorkers = (
  { inventory, remembered }: Observed,
  hosts: readonly string[],
): readonly string[] => {
  const isPrivateHost = (host: string): boolean => Arr.contains(hosts, Str.toLowerCase(host));
  return union(
    pipe(
      inventory.domains,
      Arr.filter((domain) => isPrivateHost(domain.hostname)),
      Arr.map((domain) => domain.service),
    ),
    pipe(
      inventory.routes,
      Arr.filter((route) => isPrivateHost(routeHost(route.pattern))),
      Arr.map((route) => route.script),
    ),
    remembered.workers,
  );
};

const privateRepositories = ({ inventory, remembered }: Observed): readonly string[] =>
  union(
    pipe(
      inventory.repositories,
      Arr.filter((repository) => repository.private),
      Arr.map((repository) => repository.id),
    ),
    remembered.repositories,
  );

export const privateSurface = (observed: Observed): Surface => {
  const hosts = privateHosts(observed);
  return {
    hosts,
    workers: privateWorkers(observed, hosts),
    repositories: privateRepositories(observed),
  };
};
