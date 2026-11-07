import type { Package } from "@masseater.dev/aredoko-protocol";
import type { ReactNode } from "react";

import { BoothItemCard } from "./booth-item-card.tsx";
import { BoothLinkForm } from "./booth-link-form.tsx";

const BoothBody = ({ item }: Readonly<{ item: typeof Package.Type }>): ReactNode => {
  if (item.booth === null) {
    return <BoothLinkForm packageId={item.id} />;
  }
  return <BoothItemCard item={item.booth} />;
};

export { BoothBody };
