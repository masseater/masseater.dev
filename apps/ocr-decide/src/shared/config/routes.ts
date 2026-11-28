import { Route } from "@effect/ui";

/** @stability experimental */
export const AppRoute = Route.union({
  Extract: Route.make("/"),
  Measurements: Route.make("/measurements"),
  OcrEngines: Route.make("/ocr-engines"),
  NotFound: Route.make("/*"),
});
