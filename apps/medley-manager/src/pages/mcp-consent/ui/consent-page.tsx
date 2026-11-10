import { ConsentForm } from "@masseater.dev/owner-auth/ui";
import { useSearch } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { Button } from "#/shared/ui/button";

const SCOPE = "曲・動画・担当者の登録と編集を許可します";

const ConsentPage = (): ReactNode => {
  const search = useSearch({ from: "/mcp_/consent" });
  return <ConsentForm button={Button} scope={SCOPE} search={search} />;
};

export { ConsentPage };
