import { headersFileFor } from "security-headers/static";

export const assetHeaders = headersFileFor(["/:app/assets/*"]);
