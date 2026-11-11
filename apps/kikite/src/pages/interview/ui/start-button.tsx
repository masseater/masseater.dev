import { Button } from "@masseater.dev/ui/button";
import { Mic } from "lucide-react";
import type { ReactNode } from "react";

const LABEL = "話し始める";

const StartButton = (): ReactNode => (
  <Button type="submit" size="lg" className="self-start">
    <Mic />
    {LABEL}
  </Button>
);

export { StartButton };
