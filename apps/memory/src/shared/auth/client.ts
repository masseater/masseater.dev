import { oauthProviderClient } from "@better-auth/oauth-provider/client";
import { passkeyClient } from "@better-auth/passkey/client";
import { createAuthClient } from "better-auth/react";

const authClient = createAuthClient({ plugins: [oauthProviderClient(), passkeyClient()] });

export { authClient };
