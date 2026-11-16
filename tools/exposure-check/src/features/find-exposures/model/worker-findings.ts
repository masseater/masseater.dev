import { Array as Arr, pipe } from "effect";

import { finding, findingIf, hostOf, isCovered } from "#/entities/exposure/index.ts";
import type { Finding, Scene, Inventory, WorkerScript } from "#/entities/exposure/index.ts";

const privateScripts = ({ inventory, surface }: Scene): readonly WorkerScript[] =>
  pipe(
    inventory.scripts,
    Arr.filter((script) => Arr.contains(surface.workers, script.name)),
  );

const alternateUrls =
  (inventory: Inventory) =>
  (script: WorkerScript): readonly Finding[] => [
    ...findingIf(script.workersDev)(() =>
      finding({
        kind: "workers-dev",
        subject: script.name,
        detail: `${script.name}.${inventory.workersSubdomain}.workers.dev が Access を通らずに開ける`,
      }),
    ),
    ...findingIf(script.previews)(() =>
      finding({
        kind: "preview-urls",
        subject: script.name,
        detail: `${script.name} のプレビューの URL が Access を通らずに開ける`,
      }),
    ),
  ];

const unprotectedDomains =
  (inventory: Inventory) =>
  (script: WorkerScript): readonly Finding[] =>
    pipe(
      inventory.domains,
      Arr.filter((domain) => domain.service === script.name),
      Arr.filter((domain) => !isCovered(inventory)(domain.hostname)),
      Arr.map((domain) =>
        finding({
          kind: "unprotected-entrypoint",
          subject: domain.hostname,
          detail: `${script.name} がカスタムドメイン ${domain.hostname} でも Access なしに受ける`,
        }),
      ),
    );

const unprotectedRoutes =
  (inventory: Inventory) =>
  (script: WorkerScript): readonly Finding[] =>
    pipe(
      inventory.routes,
      Arr.filter((route) => route.script === script.name),
      Arr.filter((route) => !isCovered(inventory)(hostOf(route.pattern))),
      Arr.map((route) =>
        finding({
          kind: "unprotected-entrypoint",
          subject: route.pattern,
          detail: `${script.name} がルート ${route.pattern} でも Access なしに受ける`,
        }),
      ),
    );

const hasPublicEntrypoint =
  (inventory: Inventory) =>
  (script: WorkerScript): boolean =>
    script.workersDev ||
    script.previews ||
    pipe(
      inventory.domains,
      Arr.some((domain) => domain.service === script.name),
    ) ||
    pipe(
      inventory.routes,
      Arr.some((route) => route.script === script.name),
    );

const sharedKeys =
  (storage: readonly string[]) =>
  (script: WorkerScript): readonly Finding[] =>
    pipe(
      script.storage,
      Arr.filter((key) => Arr.contains(storage, key)),
      Arr.map((key) =>
        finding({
          kind: "shared-storage",
          subject: `${script.name}/${key}`,
          detail: `外から届く ${script.name} が、Access の背後の Worker と同じ ${key} を読み書きできる`,
        }),
      ),
    );

const sharedStorage = (scene: Scene): readonly Finding[] => {
  const storage = pipe(
    privateScripts(scene),
    Arr.flatMap((script) => script.storage),
    Arr.dedupe,
  );
  return pipe(
    scene.inventory.scripts,
    Arr.filter((script) => !Arr.contains(scene.surface.workers, script.name)),
    Arr.filter(hasPublicEntrypoint(scene.inventory)),
    Arr.flatMap(sharedKeys(storage)),
  );
};

export const workerFindings = (scene: Scene): readonly Finding[] => [
  ...pipe(privateScripts(scene), Arr.flatMap(alternateUrls(scene.inventory))),
  ...pipe(privateScripts(scene), Arr.flatMap(unprotectedDomains(scene.inventory))),
  ...pipe(privateScripts(scene), Arr.flatMap(unprotectedRoutes(scene.inventory))),
  ...sharedStorage(scene),
];
