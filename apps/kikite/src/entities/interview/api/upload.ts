import { Array as Arr, Effect, Ref, Schedule } from "effect";

import { recordingAtom, savingAtom } from "#/entities/interview/model/atoms.ts";
import { encodeRecord, recordOf } from "#/entities/interview/model/record.ts";
import { saveSession } from "#/shared/api/index.ts";
import { read, write } from "#/shared/lib/registry.ts";
import { runtime } from "#/shared/lib/runtime.ts";

const SAVE_EVERY = "3 seconds";

/** @internal */
export const upload = Effect.fn("kikite.saveSession")(function* upload() {
  const record = yield* recordOf;
  if (Arr.isReadonlyArrayEmpty(record.entries)) {
    return;
  }
  const { id } = yield* read(recordingAtom);
  yield* write(savingAtom, { status: "saving" });
  yield* saveSession({ id, record }).pipe(
    Effect.matchEffect({
      onSuccess: () => write(savingAtom, { status: "saved" }),
      onFailure: ({ message }) => write(savingAtom, { status: "failed", message }),
    }),
  );
});

const saveIfChanged = Effect.fn("kikite.saveIfChanged")(function* saveIfChanged(
  last: Ref.Ref<string>,
) {
  const json = yield* recordOf.pipe(Effect.flatMap(encodeRecord));
  if (json === (yield* Ref.get(last))) {
    return;
  }
  yield* upload();
  if ((yield* read(savingAtom)).status === "saved") {
    yield* Ref.set(last, json);
  }
});

/** @internal */
export const autosaving = Effect.gen(function* autosaving() {
  const last = yield* Ref.make("");
  yield* Effect.repeat(saveIfChanged(last), Schedule.spaced(SAVE_EVERY));
});

/** @internal */
export const uploadAtom = runtime.fn(() => upload());
