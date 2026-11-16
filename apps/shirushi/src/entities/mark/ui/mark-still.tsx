import { Option } from "effect";
import type { ReactNode } from "react";

import { useStill } from "#/entities/mark/model/still.ts";

export const MarkStill = ({ id }: Readonly<{ id: string }>): ReactNode =>
  Option.match(useStill(id), {
    onNone: () => <span className="bg-muted aspect-video w-16 shrink-0 rounded-sm" />,
    onSome: (jpeg) => (
      <img
        src={`data:image/jpeg;base64,${jpeg}`}
        alt=""
        className="aspect-video w-16 shrink-0 rounded-sm object-cover"
      />
    ),
  });
