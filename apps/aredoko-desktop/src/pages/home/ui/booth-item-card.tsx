import type { BoothItem } from "@masseater.dev/aredoko-protocol";
import type { ReactNode } from "react";

import { OpenerButton } from "./opener-button.tsx";

const BoothItemCard = ({ item }: Readonly<{ item: typeof BoothItem.Type }>): ReactNode => (
  <div className="flex flex-col gap-2 rounded-lg border p-4">
    <p className="text-sm font-medium">{item.name}</p>
    <p className="text-muted-foreground text-xs">{`${item.shop}・${item.price}`}</p>
    <OpenerButton opens="booth" target={item.url} />
  </div>
);

export { BoothItemCard };
