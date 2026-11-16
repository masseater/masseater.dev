import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import type { Activity } from "#/pages/home/model/activity.ts";

const LINK = "text-link hover:decoration-2 underline underline-offset-3";

export const ActivityTitle = ({ activity }: Readonly<{ activity: Activity }>): ReactNode => {
  const { link } = activity;
  if (link.kind === "memo") {
    return (
      <Link className={LINK} params={link.params} to="/memos/$project/$name">
        {activity.title}
      </Link>
    );
  }
  if (link.kind === "conversation") {
    return (
      <Link className={LINK} params={link.params} to="/conversations/$session">
        {activity.title}
      </Link>
    );
  }
  return (
    <Link className={LINK} to={link.to}>
      {activity.title}
    </Link>
  );
};
