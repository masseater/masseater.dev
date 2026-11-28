import { layerHttp } from "@effect/ui/html/HtmlServerHttp";
import { beaconHtml } from "@masseater.dev/ui/web-analytics";
import { document } from "virtual:@effect/ui/document";

import { AppRoute } from "#/shared/config/index.ts";

import { App } from "./app.ts";

const WEB_ANALYTICS = beaconHtml(import.meta.env["VITE_CF_BEACON_TOKEN"]);

/** @internal */
const pages = layerHttp(App, {
  routes: AppRoute,
  base: import.meta.env.BASE_URL,
  document: (page) => document({ ...page, head: `${page.head}${WEB_ANALYTICS}` }),
});

export default pages;

export const prerender = [
  AppRoute.print(AppRoute.Extract()),
  AppRoute.print(AppRoute.Measurements()),
  AppRoute.print(AppRoute.OcrEngines()),
];
