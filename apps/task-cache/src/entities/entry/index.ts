export {
  REMOVED_AT_ONCE,
  blobIdOf,
  blobOf,
  dropOverflow,
  entryOf,
  isInline,
  newest,
  oldest,
  olderThan,
  remove,
  save,
  sizeOf,
  storedBytes,
  valueOf,
} from "./api/entries.ts";
export type { BlobRef, Entry, Sized } from "./api/entries.ts";
export { isPublic, setPublic } from "./api/namespaces.ts";
