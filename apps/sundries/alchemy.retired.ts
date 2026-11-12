import { tracedStackProps } from "@masseater.dev/cloudflare-account/traced-providers";
import { Stack } from "alchemy";
import { Effect } from "effect";

export default Stack("masseater-dev-personal-mcp", tracedStackProps, Effect.void);
