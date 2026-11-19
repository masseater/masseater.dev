import { layer as nodeServices } from "@effect/platform-node/NodeServices";
import { lintText } from "@r_masseater/fu4";
import {
  Array as Arr,
  Effect,
  FileSystem,
  ManagedRuntime,
  Path,
  String as Str,
  pipe,
} from "effect";
import { afterAll, expect, test } from "vite-plus/test";

import { actionlint } from "./presets.ts";

const services = ManagedRuntime.make(nodeServices);
afterAll(() => services.dispose());

const BOTH_USES = 2;

const ACTION =
  "name: install\ndescription: install\nruns:\n  using: composite\n  steps:\n    - run: echo hi\n      shell: bash\n";

const CALLED =
  "on:\n  workflow_call:\njobs:\n  build:\n    runs-on: ubuntu-latest\n    steps:\n      - run: echo hi\n";

const workflowUsing = (action: string, called: string): string =>
  `on: push\njobs:\n  build:\n    uses: ${called}\n  test:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: ${action}\n`;

const messagesFor = Effect.fn("messagesFor")(function* messagesFor(text: string) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const root = yield* fileSystem.makeTempDirectory({ prefix: "fu4-self-reference-" });
  yield* fileSystem.makeDirectory(path.join(root, ".github", "actions", "install"), {
    recursive: true,
  });
  yield* fileSystem.makeDirectory(path.join(root, ".github", "workflows"), { recursive: true });
  yield* fileSystem.writeFileString(
    path.join(root, ".github", "actions", "install", "action.yml"),
    ACTION,
  );
  yield* fileSystem.writeFileString(path.join(root, ".github", "workflows", "build.yml"), CALLED);
  const found = yield* lintText({
    root,
    path: ".github/workflows/ci.yml",
    text,
    config: actionlint(),
  });
  return pipe(
    found,
    Arr.filter(
      (each) => each.rule === "actionlint/action" || each.rule === "actionlint/workflow-call",
    ),
    Arr.map((each) => `${String(each.line)}:${String(each.column)} ${each.message}`),
  );
});

test("accepts $/ self repository references that GitHub added after actionlint 1.7.12", () =>
  services.runPromise(
    Effect.gen(function* selfReference() {
      const messages = yield* messagesFor(
        workflowUsing("$/.github/actions/install", "$/.github/workflows/build.yml"),
      );
      expect(messages).toStrictEqual([]);
    }),
  ));

test("rejects a ref on a $/ self repository reference", () =>
  services.runPromise(
    Effect.gen(function* selfReferenceWithRef() {
      const messages = yield* messagesFor(
        workflowUsing("$/.github/actions/install@v1", "$/.github/workflows/build.yml@v1"),
      );
      expect(messages).toHaveLength(BOTH_USES);
      const mentionsRef = Str.includes("must not include @{ref}");
      expect(pipe(messages, Arr.every(mentionsRef))).toBe(true);
    }),
  ));
