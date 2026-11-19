import type { ComponentProps, ReactNode } from "react";

const FOCUSABLE = 0;

const FALLBACK_LABEL = "表";

export const ScrollTable = ({
  children,
  "aria-labelledby": labelledBy,
}: Readonly<Pick<ComponentProps<"table">, "aria-labelledby" | "children">>): ReactNode => (
  <section
    aria-label={FALLBACK_LABEL}
    aria-labelledby={labelledBy}
    className="my-8 overflow-x-auto"
    tabIndex={FOCUSABLE}
  >
    <table className="my-0">{children}</table>
  </section>
);
