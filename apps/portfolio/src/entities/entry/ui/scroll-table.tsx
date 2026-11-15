import type { ReactNode } from "react";

export const ScrollTable = ({ children }: Readonly<{ children: ReactNode }>): ReactNode => (
  <div className="my-8 overflow-x-auto">
    <table className="my-0">{children}</table>
  </div>
);
