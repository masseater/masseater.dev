import { Story } from "@effect/ui/testing";
import { assert, it } from "@effect/vitest";
import { Effect, Option } from "effect";

import { LoadPicture } from "#/features/pick-picture/api/load-picture.ts";
import {
  PicturePickerEvents,
  PicturePickerMessage,
  PicturePickerStatus,
} from "#/features/pick-picture/model/messages.ts";

import { PicturePickerNoDeps } from "./picture-picker.ts";

const PICTURE = { name: "sample.png", url: "/samples/sample.png", source: "/samples/sample.png" };

const CLEARED = PicturePickerEvents.ChangedPicture({ picture: Option.none() });

it.effect("loads a sample and reports the picture once it is ready", () =>
  Effect.gen(function* body() {
    const story = yield* Story.make(PicturePickerNoDeps, {});
    story
      .send(PicturePickerMessage.ClickedSample({ name: PICTURE.name }))
      .expectExact(LoadPicture)
      .emitted(CLEARED);
    assert.deepStrictEqual(story.model, PicturePickerStatus.Loading({ name: PICTURE.name }));
    story
      .resolve(LoadPicture, PicturePickerMessage.LoadedPicture({ picture: PICTURE }))
      .emitted(PicturePickerEvents.ChangedPicture({ picture: Option.some(PICTURE) }));
    assert.deepStrictEqual(story.model, PicturePickerStatus.Ready({ name: PICTURE.name }));
  }),
);

it.effect("marks the picture unreadable when it fails to load", () =>
  Effect.gen(function* body() {
    const story = yield* Story.make(PicturePickerNoDeps, {});
    story
      .send(PicturePickerMessage.ClickedSample({ name: PICTURE.name }))
      .expectExact(LoadPicture)
      .emitted(CLEARED)
      .resolve(LoadPicture, PicturePickerMessage.FailedLoadPicture({ name: PICTURE.name }));
    assert.deepStrictEqual(story.model, PicturePickerStatus.Failed({ name: PICTURE.name }));
  }),
);
