import { D1 } from "@alchemy.run/cloudflare";
import { tracedStackProps } from "@masseater.dev/cloudflare-account/traced-providers";
import { RemovalPolicy, Stack } from "alchemy";
import { Effect } from "effect";

export default Stack(
  "masseater-dev-money",
  tracedStackProps,
  D1.Database("Ledger", {}).pipe(RemovalPolicy.destroy(), Effect.asVoid),
);
