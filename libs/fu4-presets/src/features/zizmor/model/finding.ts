import type { Option } from "effect";

import type { Subfeature } from "#/shared/subfeature/index.ts";
import type { Point, Route } from "#/shared/yamlpath/index.ts";

export type Persona = "auditor" | "pedantic" | "regular";
export type Confidence = "low" | "medium" | "high";
export type Severity = "informational" | "low" | "medium" | "high";

export type FeatureKind =
  | { readonly type: "normal" }
  | { readonly type: "subfeature"; readonly subfeature: Subfeature }
  | { readonly type: "key-only" };

export type LocationKind = "primary" | "related" | "hidden";

export interface SymbolicLocation {
  readonly annotation: string;
  readonly link: Option.Option<string>;
  readonly route: Route;
  readonly feature: FeatureKind;
  readonly kind: LocationKind;
}

export interface Comment {
  readonly raw: string;
  readonly start: Point;
  readonly offset: number;
}

export interface ConcreteFeature {
  readonly start: Point;
  readonly end: Point;
  readonly startOffset: number;
  readonly endOffset: number;
  readonly text: string;
  readonly comments: readonly Comment[];
}

export interface Location {
  readonly symbolic: SymbolicLocation;
  readonly concrete: ConcreteFeature;
}

export interface FindingDraft {
  readonly ident: string;
  readonly desc: string;
  readonly url: string;
  readonly severity: Severity;
  readonly confidence: Confidence;
  readonly persona: Persona;
  readonly locations: readonly SymbolicLocation[];
  readonly rawLocations: readonly Location[];
  readonly tip: Option.Option<string>;
}

export interface Finding {
  readonly ident: string;
  readonly desc: string;
  readonly url: string;
  readonly severity: Severity;
  readonly confidence: Confidence;
  readonly persona: Persona;
  readonly locations: readonly Location[];
  readonly tip: Option.Option<string>;
  readonly ignored: boolean;
}
