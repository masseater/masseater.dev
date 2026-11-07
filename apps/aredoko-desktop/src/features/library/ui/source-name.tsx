import type { Source } from "@masseater.dev/aredoko-protocol";
import { Option } from "effect";
import type { ReactNode } from "react";

import type { NamedFolder } from "#/features/library/api/queries";
import { Badge } from "#/shared/ui/badge";

const KIND_LABELS: Readonly<Record<(typeof Source.Type)["kind"], string>> = {
  folder: "フォルダ",
  project: "Unity プロジェクト",
};

const SourceName = ({
  source,
  named,
}: Readonly<{ source: typeof Source.Type; named: Option.Option<NamedFolder> }>): ReactNode => {
  if (Option.isSome(named)) {
    return (
      <span className="min-w-0 flex-1 truncate text-sm font-medium" title={source.path}>
        {named.value.name}
      </span>
    );
  }
  return (
    <>
      <Badge variant="secondary">{KIND_LABELS[source.kind]}</Badge>
      <span className="min-w-0 flex-1 truncate text-sm" title={source.path}>
        {source.path}
      </span>
    </>
  );
};

export { SourceName };
