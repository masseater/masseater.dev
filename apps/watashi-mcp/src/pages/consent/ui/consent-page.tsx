import { ConsentForm } from "@masseater.dev/owner-auth/ui";
import { Button } from "@masseater.dev/ui/button";
import { useSearch } from "@tanstack/react-router";
import type { ReactNode } from "react";

const SCOPE = "記憶と ToDo の読み書きを許可します";

const ConsentPage = (): ReactNode => {
  const search = useSearch({ from: "/consent" });
  return <ConsentForm button={Button} scope={SCOPE} search={search} />;
};

export { ConsentPage };
