import { ConsentForm } from "@masseater.dev/owner-auth/ui";
import { useSearch } from "@tanstack/react-router";
import { Option } from "effect";
import type { ReactNode } from "react";

import { Button } from "#/shared/ui/button";

const SCOPE = "曲・動画・担当者の登録と編集を許可します";

const ConsentPage = (): ReactNode => {
  const { client_id: clientId } = useSearch({ from: "/mcp_/consent" });
  return Option.match(Option.fromUndefinedOr(clientId), {
    onNone: () => false,
    onSome: (id) => <ConsentForm button={Button} scope={SCOPE} clientId={id} />,
  });
};

export { ConsentPage };
