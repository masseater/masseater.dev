import { Console, Effect, FileSystem, Path, Schema } from "effect";

const DAY = 86_400_000;

export const writeReport = Effect.fn("output.write")(function* writeReport<
  Value extends Schema.Codec<unknown, unknown>,
>({
  out,
  name,
  codec,
  value,
  summary,
}: Readonly<{ out: string; name: string; codec: Value; value: Value["Type"]; summary: string }>) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const text = yield* Schema.encodeEffect(Schema.fromJsonString(codec))(value);
  yield* fileSystem.makeDirectory(out, { recursive: true });
  yield* fileSystem.writeFileString(path.join(out, `${name}.json`), text);
  yield* fileSystem.writeFileString(path.join(out, `${name}.md`), summary);
  yield* Console.log(summary);
});

export const sinceDays =
  (days: number) =>
  (now: number): number =>
    now - days * DAY;
