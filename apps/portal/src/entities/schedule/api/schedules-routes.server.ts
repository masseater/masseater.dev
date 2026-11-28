import { attempt, createRouter, respond } from "#/shared/api/index.server.ts";

export const schedulesRoutes = createRouter("/api/schedules").get("/", ({ request }) =>
  respond(request)(attempt(({ SCHEDULES }) => SCHEDULES.list())),
);

export type SchedulesRoutes = typeof schedulesRoutes;
