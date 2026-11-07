import { Package } from "lucide-react";
import { useCallback } from "react";
import type { ReactNode } from "react";

import { useShowPackage } from "#/pages/home/model";

import { ActionButton } from "./action-button.tsx";

const LABEL = "パッケージを表示";

const ShowPackageButton = ({ id }: Readonly<{ id: number }>): ReactNode => {
  const showPackage = useShowPackage();
  const onClick = useCallback(() => {
    showPackage(id);
  }, [showPackage, id]);
  return (
    <ActionButton onClick={onClick}>
      <Package />
      {LABEL}
    </ActionButton>
  );
};

export { ShowPackageButton };
