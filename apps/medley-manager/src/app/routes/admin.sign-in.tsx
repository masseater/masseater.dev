import { createFileRoute } from "@tanstack/react-router";

import { SignInPage } from "#/pages/admin-sign-in";

const Route = createFileRoute("/admin/sign-in")({ component: SignInPage });

export { Route };
