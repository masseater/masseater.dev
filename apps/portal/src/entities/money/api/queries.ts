import { run } from "@r_masseater/workers-tracing/effect";
import { createIsomorphicFn } from "@tanstack/react-start";
import { Effect } from "effect";

import { browserClient, createQueries, serverClient } from "#/shared/api";

import type { MoneyRoutes } from "./money-routes.server";

const loadMoneyHandle = (): Promise<(request: Request) => Promise<Response>> =>
  run(
    Effect.promise(() => import("./handle.server")).pipe(
      Effect.map((module) => module.handleMoney),
    ),
  );

const client = createIsomorphicFn()
  .server(() => serverClient<MoneyRoutes>(loadMoneyHandle))
  .client(() => browserClient<MoneyRoutes>());

const moneyQueries = createQueries<MoneyRoutes>(client()).api.money;

export { moneyQueries };
