import type { Source } from "@masseater.dev/aredoko-protocol";
import { Option } from "effect";
import type { ReactNode } from "react";

import type { NamedFolder } from "#/features/library/api/queries";
import { Badge } from "#/shared/ui/badge";

import { RemoveSourceButton } from "./remove-source-button.tsx";
import { SourceName } from "./source-name.tsx";

const SourceRow = ({
  source,
  named,
}: Readonly<{ source: typeof Source.Type; named: Option.Option<NamedFolder> }>): ReactNode => {
  const removable = Option.match(named, {
    onNone: () => true,
    onSome: ({ removable: allowed }) => allowed,
  });
  return (
    <li className="flex items-center gap-2 rounded-md border px-2 py-1.5">
      <SourceName source={source} named={named} />
      <Badge variant="outline">{`${source.packages.toString()} 件`}</Badge>
      {removable && <RemoveSourceButton id={source.id} />}
    </li>
  );
};

export { SourceRow };
