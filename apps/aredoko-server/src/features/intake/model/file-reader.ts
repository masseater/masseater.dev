import { Reader } from "@zip.js/zip.js";

type ReadRange = (index: number, length: number) => Promise<Uint8Array>;

/** @internal */
class FileReader extends Reader<ReadRange> {
  readonly #read: ReadRange;

  public constructor(read: ReadRange, size: number) {
    super(read);
    this.#read = read;
    this.size = size;
  }

  public override readUint8Array(index: number, length: number): Promise<Uint8Array> {
    return this.#read(index, length);
  }
}

export { FileReader };
export type { ReadRange };
