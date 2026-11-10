import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import type { ConsentView } from "./consent";

const ConsentDetails = ({ details }: Readonly<{ details: ConsentView["details"] }>): ReactNode => (
  <dl className="flex flex-col gap-2 text-sm">
    {pipe(
      details,
      Arr.map(({ label, values }) => (
        <div key={label}>
          <dt className="text-muted-foreground">{label}</dt>
          {pipe(
            values,
            Arr.map((value) => (
              <dd key={value} className="font-mono break-all">
                {value}
              </dd>
            )),
          )}
        </div>
      )),
    )}
  </dl>
);

export { ConsentDetails };
