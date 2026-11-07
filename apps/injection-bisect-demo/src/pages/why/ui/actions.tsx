import { Button } from "@masseater.dev/web-ui";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { COPY } from "#/pages/why/model/copy";

const Actions = (): ReactNode => (
  <div className="flex flex-wrap gap-3">
    <Button asChild>
      <Link to="/">{COPY.demo}</Link>
    </Button>
    <Button asChild variant="outline">
      <a href={COPY.npmUrl}>{COPY.npm}</a>
    </Button>
  </div>
);

export { Actions };
