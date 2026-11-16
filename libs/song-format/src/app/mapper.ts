import { flatMap, promise, runPromise } from "effect/Effect";
import { runContentMapper } from "ts-content-mapper";

runContentMapper({
  diagnosticSource: "fumx",
  transform: ({ fileName, content }, { positionEncoding }) =>
    runPromise(
      promise(() => import("#/app/transform.ts")).pipe(
        flatMap(({ transform }) =>
          promise(() => transform({ fileName, content, positionEncoding })),
        ),
      ),
    ),
});
