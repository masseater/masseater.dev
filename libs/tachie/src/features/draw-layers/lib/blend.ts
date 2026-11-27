import type { BlendMode } from "ag-psd";
import { Option } from "effect";

const OPERATIONS: ReadonlyMap<BlendMode, GlobalCompositeOperation> = new Map<
  BlendMode,
  GlobalCompositeOperation
>([
  ["normal", "source-over"],
  ["pass through", "source-over"],
  ["darken", "darken"],
  ["multiply", "multiply"],
  ["color burn", "color-burn"],
  ["lighten", "lighten"],
  ["screen", "screen"],
  ["color dodge", "color-dodge"],
  ["linear dodge", "lighter"],
  ["overlay", "overlay"],
  ["soft light", "soft-light"],
  ["hard light", "hard-light"],
  ["difference", "difference"],
  ["exclusion", "exclusion"],
  ["hue", "hue"],
  ["saturation", "saturation"],
  ["color", "color"],
  ["luminosity", "luminosity"],
]);

export const operationOf = (mode: BlendMode | undefined): GlobalCompositeOperation =>
  Option.getOrElse(
    Option.flatMap(Option.fromNullishOr(mode), (found) =>
      Option.fromNullishOr(OPERATIONS.get(found)),
    ),
    () => "source-over",
  );
