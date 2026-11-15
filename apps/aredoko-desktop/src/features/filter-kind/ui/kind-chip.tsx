import type { AssetKind } from "@masseater.dev/aredoko-protocol";
import { Button } from "@masseater.dev/ui/button";
import { Array } from "effect";
import { useCallback } from "react";
import type { ReactNode } from "react";

import { KIND_LABELS, useKinds, useToggleKind } from "#/entities/asset/index.ts";

const variantOf = (selected: boolean): "secondary" | "outline" => {
  if (selected) {
    return "secondary";
  }
  return "outline";
};

export const KindChip = ({ kind }: Readonly<{ kind: typeof AssetKind.Type }>): ReactNode => {
  const kinds = useKinds();
  const toggle = useToggleKind();
  const selected = Array.contains(kinds, kind);
  const onClick = useCallback(() => {
    toggle(kind);
  }, [toggle, kind]);
  return (
    <Button size="xs" variant={variantOf(selected)} aria-pressed={selected} onClick={onClick}>
      {KIND_LABELS[kind]}
    </Button>
  );
};
