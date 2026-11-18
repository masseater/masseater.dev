import { D1 } from "@alchemy.run/cloudflare";
import { tracedStackProps } from "@masseater.dev/cloudflare-account/traced-providers";
import { RemovalPolicy, Stack } from "alchemy";

export default Stack(
  "medley-manager",
  tracedStackProps,
  D1.Database("DB", { migrations: "./drizzle" }).pipe(RemovalPolicy.destroy()),
);
