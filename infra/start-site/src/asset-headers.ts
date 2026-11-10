import { headersFileFor } from "security-headers/static";

const assetHeaders = headersFileFor(["/:app/assets/*"]);

export { assetHeaders };
