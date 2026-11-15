import type { FileParams } from "@masseater.dev/watashi-protocol";
import { Record as Rec } from "effect";

import type { FileKey } from "./conversation-store.server";

export const paramsOf = (request: Request): Readonly<Record<string, string>> =>
  Rec.fromEntries(new URL(request.url).searchParams.entries());

export const fileKeyOf = ({ kind, session, file }: FileParams): FileKey => ({
  kind,
  sessionId: session,
  file,
});
