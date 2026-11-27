import { mockIPC } from "@tauri-apps/api/mocks";
import { Option, Record as Rec, Schema, pipe } from "effect";

export type FakeDisk = Readonly<{
  saved: () => Option.Option<string>;
  exported: () => Option.Option<string>;
}>;

const isSaved = Schema.is(Schema.Struct({ json: Schema.String }));

const NOTHING = Option.getOrNull(Option.none<string>());

type Handler = (payload: unknown) => unknown;

export const fakeCommands = (): FakeDisk => {
  const disk = { library: Option.none<string>(), preset: Option.none<string>() };
  const handlers: Readonly<Record<string, Handler>> = {
    load_library: () => Option.getOrNull(disk.library),
    save_library: (payload) => {
      if (isSaved(payload)) {
        disk.library = Option.some(payload.json);
      }
      return NOTHING;
    },
    export_preset: (payload) => {
      if (isSaved(payload)) {
        disk.preset = Option.some(payload.json);
      }
      return true;
    },
    list_baselines: () => [],
  };
  mockIPC((command, payload) =>
    pipe(
      Rec.get(handlers, command),
      Option.match({
        onNone: () => {
          throw new Error(`unexpected command ${command}`);
        },
        onSome: (handler) => handler(payload),
      }),
    ),
  );
  return { saved: () => disk.library, exported: () => disk.preset };
};
