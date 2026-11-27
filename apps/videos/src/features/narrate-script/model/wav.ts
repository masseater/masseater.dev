import { Option } from "effect";

const BYTE_RATE_AT = 28;
const FIRST_CHUNK_AT = 12;
const CHUNK_HEADER = 8;
const ID_LENGTH = 4;
const SIZE_AT = 4;
const DATA = "data";
const LITTLE_ENDIAN = true;

const ascii = new TextDecoder("ascii");

/** @internal */
export const wavSeconds = (wav: Uint8Array): Option.Option<number> => {
  const view = new DataView(wav.buffer, wav.byteOffset, wav.byteLength);
  const byteRate = view.getUint32(BYTE_RATE_AT, LITTLE_ENDIAN);
  let offset = FIRST_CHUNK_AT;
  while (offset + CHUNK_HEADER <= wav.byteLength) {
    const id = ascii.decode(wav.subarray(offset, offset + ID_LENGTH));
    const size = view.getUint32(offset + SIZE_AT, LITTLE_ENDIAN);
    if (id === DATA) {
      return Option.some(size / byteRate);
    }
    offset += CHUNK_HEADER + size;
  }
  return Option.none();
};
