import { Button } from "@masseater.dev/web-ui";
import { Array as Arr, Option } from "effect";
import { useCallback } from "react";
import type { ReactNode } from "react";

import { useExtract } from "#/pages/extract/api/use-extract";
import { usePicture } from "#/pages/extract/api/use-picture";
import { COPY } from "#/pages/extract/model/copy";
import { useApiKey, useWay } from "#/pages/extract/model/draft";
import { WAYS } from "#/pages/extract/model/ways";

import { ExtractResult } from "./extract-result";

const labelOf = (running: boolean): string => {
  if (running) {
    return COPY.running;
  }
  return COPY.run;
};

const RunPanel = (): ReactNode => {
  const picture = usePicture();
  const apiKey = useApiKey();
  const wayKey = useWay();
  const { state, start } = useExtract();
  const way = Arr.findFirst(WAYS, ({ key }) => key === wayKey);
  const running = state.status === "running";
  const ready = picture.status === "ready" && apiKey !== "" && Option.isSome(way) && !running;
  const run = useCallback(() => {
    if (picture.status === "ready" && Option.isSome(way)) {
      start({ bytes: picture.bytes, apiKey, way: way.value });
    }
  }, [picture, apiKey, way, start]);
  return (
    <div className="flex flex-col items-start gap-4">
      <Button onClick={run} disabled={!ready}>
        {labelOf(running)}
      </Button>
      <ExtractResult state={state} />
    </div>
  );
};

export { RunPanel };
