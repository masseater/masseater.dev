import { API_TOKEN_BYTES, API_TOKEN_PREFIX } from "@masseater.dev/watashi-protocol";
import { Array as Arr, pipe } from "effect";

const BETTERLEAKS_VERSION = "2.0.0-rc.7";

const BASE64_BITS = 6;
const BYTE_BITS = 8;

const TOKEN_LENGTH = Math.ceil((API_TOKEN_BYTES * BYTE_BITS) / BASE64_BITS);

const ID_PREFIXES = pipe(
  [
    "session",
    "cse",
    "cmsg",
    "toolu",
    "srvtoolu",
    "msg",
    "req",
    "chan",
    "env",
    "trig",
    "user",
    "file",
    "call",
    "agent",
  ],
  Arr.join("|"),
);

const BETTERLEAKS_CONFIG = `
[extend]
useDefault = true

[[rules]]
id = 'watashi-token'
description = 'watashi API token'
regex = '''\\b(${API_TOKEN_PREFIX}[A-Za-z0-9_-]{${String(TOKEN_LENGTH)}})'''
keywords = ['${API_TOKEN_PREFIX}']
confidence = 'high'

[[rules]]
id = 'pasted-token'
description = 'High-entropy token pasted into a conversation'
regex = '''(?:^|[^A-Za-z0-9_\\-])([A-Za-z0-9_\\-]{32,256})(?:[^A-Za-z0-9_\\-]|$)'''
confidence = 'medium'
filter = '''
entropy(finding["secret"]) < 4.0 || !(finding["secret"] matches "[A-Z]" && finding["secret"] matches "[a-z]" && finding["secret"] matches "[0-9]") || matchesAny(finding["secret"], [\`^(?:${ID_PREFIXES})_\`])
'''
`;

/** @internal */
export { BETTERLEAKS_CONFIG, BETTERLEAKS_VERSION };
