import { ConsentForm } from "@masseater.dev/owner-auth/ui";
import { Button } from "@masseater.dev/ui/button";
import { useSearch } from "@tanstack/react-router";
import { Option } from "effect";
import type { ReactNode } from "react";

const SCOPE = "記憶と ToDo の読み書きを許可します";

const ConsentPage = (): ReactNode => {
  const { client_id: clientId } = useSearch({ from: "/consent" });
  return Option.match(Option.fromUndefinedOr(clientId), {
    onNone: () => false,
    onSome: (id) => <ConsentForm button={Button} scope={SCOPE} clientId={id} />,
  });
};

export { ConsentPage };
