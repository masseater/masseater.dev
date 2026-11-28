import { UiSchema } from "@effect/ui";
import { Html } from "@effect/ui/html";
import { Option, Schema } from "effect";

import { DIRECT, PictureSchema } from "#/entities/extraction/index.ts";
import { WayField } from "#/features/choose-way/index.ts";
import { PicturePicker, PicturePreview } from "#/features/pick-picture/index.ts";
import { RunPanel } from "#/features/run-extract/index.ts";
import { AppRoute, COPY } from "#/shared/config/index.ts";
import { PageLink } from "#/shared/ui/page-link.ts";

const ExtractPageMessage = UiSchema.TaggedEnum({
  ChangedPicture: { picture: Schema.Option(PictureSchema) },
  ChangedWay: { way: Schema.String },
});

/** @stability experimental */
// oxlint-disable-next-line effecttsgo/missing-pipeable-signature -- Effect UI components are called as (html, options)
export const ExtractPage = Html.component({
  name: "ExtractPage",
  model: Schema.Struct({
    picture: Schema.Option(PictureSchema),
    way: Schema.String,
  }),
  message: ExtractPageMessage,
}).make({
  init: () => ({ picture: Option.none(), way: DIRECT.key }),
  update: {
    ChangedPicture: (step, { picture }) => step.evolve({ picture: () => picture }),
    ChangedWay: (step, { way }) => step.evolve({ way: () => way }),
  },
  view: (html, model) =>
    html.main.class("vt-match mx-auto flex max-w-2xl flex-col gap-6 px-4 py-12 md:px-8").children(
      html.h1.class("text-2xl font-bold").children(COPY.title),
      PicturePicker(html, {
        key: "picker",
        onEmit: { ChangedPicture: ({ picture }) => ExtractPageMessage.ChangedPicture({ picture }) },
      }),
      Option.match(model.picture, {
        onNone: () => false,
        onSome: (picture) => PicturePreview({ html, picture }),
      }),
      WayField({
        html,
        way: model.way,
        onChange: (way) => ExtractPageMessage.ChangedWay({ way }),
      }),
      RunPanel(html, { key: "run", props: model }),
      PageLink({ html, route: AppRoute.Measurements() }).children(COPY.measurements),
      PageLink({ html, route: AppRoute.OcrEngines() }).children(COPY.ocrEngines),
    ),
});
