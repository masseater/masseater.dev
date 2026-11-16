import { createFileRoute } from "@tanstack/react-router";

import { RegisterPage } from "#/pages/register/index.ts";

export const Route = createFileRoute("/register")({ component: RegisterPage });
