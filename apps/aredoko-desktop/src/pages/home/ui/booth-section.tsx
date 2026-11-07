import type { Package } from "@masseater.dev/aredoko-protocol";
import type { ReactNode } from "react";

import { BoothBody } from "./booth-body.tsx";

const TITLE = "BOOTH";

const BoothSection = ({ item }: Readonly<{ item: typeof Package.Type }>): ReactNode => (
  <section className="flex flex-col gap-2">
    <h4 className="text-sm font-medium">{TITLE}</h4>
    <BoothBody item={item} />
  </section>
);

export { BoothSection };
