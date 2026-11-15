import { Reader } from "@zip.js/zip.js";

export type ReadRange = (index: number, length: number) => Promise<Uint8Array>;

/** @internal */
export class FileReader extends Reader<ReadRange> {
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
