import { Option } from "effect";

import type {
  Features,
  ResolutionMode,
  ResolutionState,
  ResolverHost,
  ResolverOptions,
} from "./resolution-types.ts";
import { ALL_FEATURES, NO_FEATURES, createOutcome, getConditions } from "./resolver-state.ts";
import { resolveNestedModule } from "./resolver.ts";

interface TypeReferenceRequest {
  readonly name: string;
  readonly containingFile: string;
  readonly options: ResolverOptions;
  readonly mode: Option.Option<ResolutionMode>;
}

const conditionsFor = (
  request: TypeReferenceRequest,
  exportsEnabled: boolean,
): readonly string[] => {
  if (!exportsEnabled) {
    return [];
  }
  return getConditions(request.options, request.mode);
};

const featuresFor = (request: TypeReferenceRequest): Features => {
  if (request.options.moduleResolution !== "Node10" || Option.isSome(request.mode)) {
    return ALL_FEATURES;
  }
  return NO_FEATURES;
};

const stateFor = (request: TypeReferenceRequest, host: ResolverHost): ResolutionState => {
  const kind = request.options.moduleResolution;
  const features = {
    ...featuresFor(request),
    esmMode: kind === "Node16" && Option.contains(request.mode, "ESNext"),
  };
  return {
    host,
    trace: Option.none(),
    options: request.options,
    cache: Option.none(),
    packageJsonCache: Option.none(),
    features,
    conditions: conditionsFor(request, features.exports),
    candidateIsFromPackageJsonField: false,
    outcome: createOutcome(),
    resolveNested: resolveNestedModule,
  };
};

export { stateFor };
export type { TypeReferenceRequest };
