import { createCsrfMiddleware } from "@tanstack/react-start";

const READS: ReadonlySet<string> = new Set(["GET", "HEAD", "OPTIONS"]);

export const sameOriginWrites = createCsrfMiddleware({
  filter: ({ request }) => !READS.has(request.method),
  allowRequestsWithoutOriginCheck: true,
});
