import { createFileRoute } from "@tanstack/react-router";

import { ClientPage } from "./client-page";

export const Route = createFileRoute("/")({ component: ClientPage });
