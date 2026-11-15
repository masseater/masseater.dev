import { createFileRoute } from "@tanstack/react-router";

import { DemoPage } from "#/pages/demo";

export const Route = createFileRoute("/")({ component: DemoPage });
