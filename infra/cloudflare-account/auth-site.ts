import { Website } from "@alchemy.run/cloudflare";
import { makeRandom } from "alchemy";
import { Effect, Option } from "effect";

interface AuthSiteProps<Bindings> {
  readonly domain: string;
  readonly name: Option.Option<string>;
  readonly bindings: Bindings;
}

const authSite = Effect.fn("authSite")(function* authSite<Bindings extends object>({
  domain,
  name,
  bindings,
}: AuthSiteProps<Bindings>) {
  const BETTER_AUTH_SECRET = yield* makeRandom("BetterAuthSecret");
  return yield* Website.Vite("Web", {
    ...Option.match(name, { onNone: () => ({}), onSome: (siteName) => ({ name: siteName }) }),
    compatibility: { flags: ["global_fetch_strictly_public"] },
    logpush: true,
    domain,
    env: { ...bindings, BETTER_AUTH_SECRET },
    viteEnvironments: { entry: "ssr", children: ["rsc"] },
  });
});

export { authSite };
export type { AuthSiteProps };
