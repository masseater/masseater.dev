import { layer as nodeServices } from "@effect/platform-node/NodeServices";
import { lintText } from "@r_masseater/fu4";
import { Array as Arr, Effect, FileSystem, ManagedRuntime, Path, pipe } from "effect";
import { afterAll, expect, test } from "vite-plus/test";

import { zizmor } from "./presets.ts";

const services = ManagedRuntime.make(nodeServices);
afterAll(() => services.dispose());

const INPUT = "template-injection/issue-988-repro.yml";
const EXPECTED = ["19:29", "30:57"];

test("reports zizmor findings at character columns, as zizmor prints them", () =>
  Effect.gen(function* columns() {
    const fileSystem = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const file = yield* path.fromFileUrl(new URL(import.meta.url));
    const root = path.join(path.dirname(file), "../features/audit-workflows/fixtures/inputs");
    const text = yield* fileSystem.readFileString(path.join(root, INPUT));
    const found = yield* lintText({
      root,
      path: INPUT,
      kind: "workflow",
      text,
      config: zizmor({ persona: "pedantic", online: false }),
    });
    const places = pipe(
      found,
      Arr.filter((each) => each.rule === "zizmor/template-injection"),
      Arr.map((each) => `${String(each.line)}:${String(each.column)}`),
    );
    expect(places).toStrictEqual(EXPECTED);
  }).pipe(services.runPromise));
