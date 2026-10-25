import type { Option } from "effect";
import { Effect, Schema } from "effect";
import { GM } from "vite-plugin-monkey/dist/client";

import { FireSettingsSchema } from "./request.ts";
import type { FireSettings } from "./request.ts";

const key = "settings";

const loadSettings: Effect.Effect<Option.Option<FireSettings>> = Effect.promise(() =>
  GM.getValue<unknown>(key),
).pipe(Effect.map(Schema.decodeUnknownOption(FireSettingsSchema)));

const saveSettings = (settings: FireSettings): Effect.Effect<void> =>
  Effect.promise(() => GM.setValue(key, settings));

export { loadSettings, saveSettings };
