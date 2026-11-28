import { Component } from "@effect/ui";
import { Html } from "@effect/ui/html";
import { Button, Icon } from "@masseater.dev/effect-ui";
import { Array as Arr, Option, pipe } from "effect";
import { FileUp } from "lucide";

import { SAMPLES } from "#/entities/extraction/index.ts";
import { LoadPicture } from "#/features/pick-picture/api/load-picture.ts";
import {
  PicturePickerEvents,
  PicturePickerMessage,
  PicturePickerStatus,
} from "#/features/pick-picture/model/messages.ts";
import { COPY } from "#/shared/config/index.ts";

const FILE_BUTTON =
  "border-input hover:bg-accent dark:bg-input/30 has-focus-visible:border-ring has-focus-visible:ring-ring/50 inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border px-3 text-sm shadow-xs has-focus-visible:ring-3 [&_svg]:size-4";

const statusText = PicturePickerStatus.match({
  None: () => "",
  Loading: ({ name }) => name,
  Failed: () => COPY.unreadable,
  Ready: ({ name }) => name,
});

const CLEARED = PicturePickerEvents.ChangedPicture({ picture: Option.none() });

/** @stability experimental */
// oxlint-disable-next-line effecttsgo/missing-pipeable-signature -- Effect UI components are called as (html, options)
export const PicturePickerNoDeps = Html.component({
  name: "PicturePicker",
  model: PicturePickerStatus,
  message: PicturePickerMessage,
  events: PicturePickerEvents,
}).make({
  init: () => PicturePickerStatus.None(),
  update: {
    ChoseFiles: (step, { files }) =>
      Option.match(Arr.head(files), {
        onNone: () => step.model,
        onSome: (file) =>
          step
            .set(PicturePickerStatus.Loading({ name: file.name }))
            .emit(CLEARED)
            .run(LoadPicture.make({ name: file.name, source: file })),
      }),
    ClickedSample: (step, { name }) =>
      step
        .set(PicturePickerStatus.Loading({ name }))
        .emit(CLEARED)
        .run(LoadPicture.make({ name, source: `${import.meta.env.BASE_URL}samples/${name}` })),
    LoadedPicture: (step, { picture }) =>
      step
        .set(PicturePickerStatus.Ready({ name: picture.name }))
        .emit(PicturePickerEvents.ChangedPicture({ picture: Option.some(picture) })),
    FailedLoadPicture: (step, { name }) => step.set(PicturePickerStatus.Failed({ name })),
  },
  view: (html, model) =>
    html.div.class("flex flex-wrap items-center gap-2").children(
      html.label.class(FILE_BUTTON).children(
        Icon({ html, node: FileUp }),
        COPY.image,
        html.input
          .attrs({ type: "file", accept: "image/*" })
          .class("sr-only")
          .value("")
          .on("change", ({ files }) => PicturePickerMessage.ChoseFiles({ files })),
      ),
      pipe(
        SAMPLES,
        Arr.map(({ name, label }) =>
          Button({
            html,
            variant: "outline",
            onPress: PicturePickerMessage.ClickedSample({ name }),
          })
            .key(name)
            .children(label),
        ),
      ),
      html.output.class("text-muted-foreground text-xs").children(statusText(model)),
    ),
});

/** @stability experimental */
// oxlint-disable-next-line effecttsgo/missing-pipeable-signature -- Effect UI components are called as (html, options)
export const PicturePicker = PicturePickerNoDeps.pipe(Component.provide(LoadPicture.live));
