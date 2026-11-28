import { String as Str } from "effect";

const UNAUTHORIZED = 401;
const RESOURCE_METADATA = "resource_metadata";

export type EndpointAnswer = Readonly<{ status: number; challenge: string }>;

export const isMcpEndpoint = (answer: EndpointAnswer): boolean =>
  answer.status === UNAUTHORIZED && Str.includes(RESOURCE_METADATA)(answer.challenge);
