import { Button } from "@masseater.dev/ui/button";
import { Effect } from "effect";
import { useCallback } from "react";
import type { ReactNode } from "react";

import { useYohaku } from "#/shared/api";
import type { Release } from "#/shared/api";

const RELEASES = "https://github.com/masseater/masseater.dev/releases/tag/yohaku-v";

const ReleaseNotesLink = ({ release }: Readonly<{ release: Release }>): ReactNode => {
  const yohaku = useYohaku();
  const open = useCallback(() => {
    Effect.runFork(yohaku.openExternal(`${RELEASES}${release.version}`));
  }, [release.version, yohaku]);
  return (
    <Button size="sm" variant="link" className="px-0 tabular-nums" onClick={open}>
      {release.version}
    </Button>
  );
};

export { ReleaseNotesLink };
