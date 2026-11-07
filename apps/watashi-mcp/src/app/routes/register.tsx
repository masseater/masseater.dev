import { createFileRoute } from "@tanstack/react-router";

import { RegisterPage } from "#/pages/register";

const Route = createFileRoute("/register")({ component: RegisterPage });

export { Route };
