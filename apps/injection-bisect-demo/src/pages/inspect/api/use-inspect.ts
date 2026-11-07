import {
  experimental_streamedQuery as streamedQuery,
  queryOptions,
  skipToken,
  useQuery,
} from "@tanstack/react-query";
import type { QueryFunction, SkipToken, UseQueryOptions } from "@tanstack/react-query";

import type { Run } from "#/pages/inspect/model/draft";
import { traceOf } from "#/pages/inspect/model/trace";
import type { Trace } from "#/pages/inspect/model/trace";

import { inspectEvents } from "./inspect-events";
import type { InspectEvent } from "./inspect-events";

type InspectState =
  | { readonly status: "idle" }
  | { readonly status: "error"; readonly message: string }
  | {
      readonly status: "streaming";
      readonly text: string;
      readonly model: string;
      readonly format: string;
      readonly events: readonly InspectEvent[];
      readonly trace: Trace;
    };

const NO_RUN = Number.NaN;

const keyOf = (run: Run): readonly ["inspect", number] => {
  if (run.status === "idle") {
    return ["inspect", NO_RUN];
  }
  return ["inspect", run.id];
};

const streamOf = (run: Run): QueryFunction<InspectEvent[]> | SkipToken => {
  if (run.status === "idle") {
    return skipToken;
  }
  return streamedQuery({ streamFn: () => inspectEvents(run) });
};

const inspectQuery = (run: Run): UseQueryOptions<InspectEvent[], Error, InspectEvent[]> =>
  queryOptions({
    queryKey: keyOf(run),
    queryFn: streamOf(run),
    staleTime: Number.POSITIVE_INFINITY,
    retry: false,
  });

const useInspect = (run: Run): InspectState => {
  const query = useQuery(inspectQuery(run));
  if (run.status === "idle") {
    return { status: "idle" };
  }
  if (query.status === "error") {
    return { status: "error", message: query.error.message };
  }
  const events = query.data ?? [];
  return {
    status: "streaming",
    text: run.text,
    model: run.model,
    format: run.format,
    events,
    trace: traceOf(events),
  };
};

export type { InspectState };
export { useInspect };
