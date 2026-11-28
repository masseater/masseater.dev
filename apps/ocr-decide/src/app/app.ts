import { Head, Router, UiSchema } from "@effect/ui";
import { Html, HtmlHead } from "@effect/ui/html";
import { PortfolioHeader, SiteStage } from "@masseater.dev/effect-ui";
import { Schema } from "effect";

import { ExtractPage } from "#/pages/extract/index.ts";
import { MeasurementsPage } from "#/pages/measurements/index.ts";
import { OcrEnginesPage } from "#/pages/ocr-engines/index.ts";
import { AppRoute, COPY } from "#/shared/config/index.ts";

const AppMessage = UiSchema.TaggedEnum({ ChangedRoute: { route: AppRoute } });

/** @stability experimental */
// oxlint-disable-next-line effecttsgo/missing-pipeable-signature -- Effect UI components are called as (html, options)
export const App = Html.component({
  name: "App",
  props: Schema.Struct({ route: AppRoute }),
  model: Schema.Struct({ route: AppRoute }),
  message: AppMessage,
}).make({
  init: (step) => ({ route: step.props.route }),
  update: { ChangedRoute: (step, { route }) => step.set({ route }).viewTransition() },
  subscriptions: ({ model }) => [
    Router.subscription(AppRoute, model.route, (route) => AppMessage.ChangedRoute({ route })),
  ],
  head: () => [
    Head.title(COPY.title),
    HtmlHead.lang("ja"),
    HtmlHead.meta({ name: "robots", content: "noindex" }),
  ],
  view: (html, { route }) =>
    SiteStage({
      html,
      children: [
        PortfolioHeader(html),
        AppRoute.match(route, {
          Extract: () => html.keepAlive((kept) => ExtractPage(kept, { key: "extract" })),
          Measurements: () => MeasurementsPage(html, { key: "measurements" }),
          OcrEngines: () => OcrEnginesPage(html, { key: "ocr-engines" }),
          NotFound: () => html.main.class("p-8").children(COPY.notFound),
        }),
      ],
    }),
});
