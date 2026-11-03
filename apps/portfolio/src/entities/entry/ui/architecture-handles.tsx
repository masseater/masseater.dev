import { Handle, Position } from "@xyflow/react";
import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

const sides = [
  ["top", Position.Top],
  ["right", Position.Right],
  ["bottom", Position.Bottom],
  ["left", Position.Left],
] as const;

const types = ["source", "target"] as const;

const ArchitectureHandles = (): ReactNode =>
  pipe(
    sides,
    Arr.flatMap(([side, position]) =>
      pipe(
        types,
        Arr.map((type) => (
          <Handle
            className={`architecture-handle architecture-handle-${side}`}
            id={`${side}-${type}`}
            key={`${side}-${type}`}
            position={position}
            type={type}
          />
        )),
      ),
    ),
  );

export { ArchitectureHandles };
