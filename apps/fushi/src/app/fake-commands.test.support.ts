import { mockIPC } from "@tauri-apps/api/mocks";
import { Option, Schema } from "effect";

export type FakeDisk = Readonly<{ saved: () => Option.Option<string> }>;

const isSaved = Schema.is(Schema.Struct({ json: Schema.String }));

const NOTHING = Option.getOrNull(Option.none<string>());

export const fakeCommands = (): FakeDisk => {
  const disk = { library: Option.none<string>() };
  mockIPC((command, payload) => {
    if (command === "load_library") {
      return Option.getOrNull(disk.library);
    }
    if (command === "save_library" && isSaved(payload)) {
      disk.library = Option.some(payload.json);
      return NOTHING;
    }
    if (command === "list_baselines") {
      return [];
    }
    throw new Error(`unexpected command ${command}`);
  });
  return { saved: () => disk.library };
};
