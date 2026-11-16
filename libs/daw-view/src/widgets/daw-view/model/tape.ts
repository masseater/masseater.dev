import { Array as Arr, Effect, Option, Schema, pipe } from "effect";

export const BLOCK_FRAMES = 32_768;
const LOW_MEMORY = 4;
const PHONE = /iPhone|iPad|iPod|Android/u;

const WORKER = `const BLOCK = ${BLOCK_FRAMES};
const HOME = "daw-view-tape";
let tracks = 0;
let blocks = 0;
let index = [];
let disk = null;
const silent = () => ({ channels: 0, scale: 0, data: new Int16Array(0) });

const openDisk = async (id) => {
  const root = await navigator.storage.getDirectory();
  const home = await root.getDirectoryHandle(HOME, { create: true });
  const stale = [];
  for await (const name of home.keys()) stale.push(name);
  for (const name of stale) {
    try { await home.removeEntry(name, { recursive: true }); } catch {}
  }
  const dir = await home.getDirectoryHandle(id, { create: true });
  const handles = [];
  for (let t = 0; t < tracks; t++) {
    const file = await dir.getFileHandle(String(t), { create: true });
    handles.push(await file.createSyncAccessHandle());
  }
  return { home, id, handles, ends: handles.map(() => 0) };
};

const pack = (L, R, a, z) => {
  let peak = 0;
  for (let i = a; i < z; i++) {
    const l = L[i] < 0 ? -L[i] : L[i];
    const r = R[i] < 0 ? -R[i] : R[i];
    if (l > peak) peak = l;
    if (r > peak) peak = r;
  }
  if (!(peak > 0)) return silent();
  const q = 32767 / peak;
  const near = 0.5 / q;
  let stereo = false;
  for (let i = a; i < z; i++) {
    const d = L[i] - R[i];
    if (d >= near || d <= -near) { stereo = true; break; }
  }
  if (stereo) {
    const data = new Int16Array((z - a) * 2);
    for (let i = a, o = 0; i < z; i++) { data[o++] = Math.round(L[i] * q); data[o++] = Math.round(R[i] * q); }
    return { channels: 2, scale: 1 / q, data };
  }
  const data = new Int16Array(z - a);
  for (let i = a, o = 0; i < z; i++) data[o++] = Math.round((L[i] + R[i]) * 0.5 * q);
  return { channels: 1, scale: 1 / q, data };
};

const put = (track, block, packed) => {
  if (!disk || packed.channels === 0) {
    index[track][block] = packed;
    return;
  }
  const at = disk.ends[track];
  disk.handles[track].write(packed.data, { at });
  disk.ends[track] = at + packed.data.byteLength;
  index[track][block] = { channels: packed.channels, scale: packed.scale, at, length: packed.data.length };
};

const write = (track, L, R) => {
  for (let b = 0; b < blocks; b++) {
    const a = b * BLOCK;
    put(track, b, pack(L, R, Math.min(a, L.length), Math.min(a + BLOCK, L.length)));
  }
};

const take = (track, block) => {
  const held = index[track][block];
  if (!held || held.channels === 0) return silent();
  if (!disk) return { channels: held.channels, scale: held.scale, data: held.data.slice() };
  const data = new Int16Array(held.length);
  disk.handles[track].read(data, { at: held.at });
  return { channels: held.channels, scale: held.scale, data };
};

const read = (block) => {
  const out = [];
  for (let t = 0; t < tracks; t++) out.push(take(t, block));
  return out;
};

const close = async () => {
  if (!disk) return;
  for (const handle of disk.handles) {
    try { handle.close(); } catch {}
  }
  try { await disk.home.removeEntry(disk.id, { recursive: true }); } catch {}
  disk = null;
};

const handle = async (data) => {
  if (data.open) {
    tracks = data.open.tracks;
    blocks = data.open.blocks;
    index = Array.from({ length: tracks }, () => []);
    try { disk = await openDisk(crypto.randomUUID()); } catch { disk = null; }
    postMessage({ opened: disk ? "disk" : "memory" });
    return;
  }
  if (data.write !== undefined) {
    write(data.write, data.left, data.right);
    return;
  }
  if (data.read !== undefined) {
    const out = read(data.read);
    postMessage({ id: data.id, tracks: out }, out.map((t) => t.data.buffer));
    return;
  }
  if (data.connect) {
    const port = data.connect;
    port.onmessage = ({ data: asked }) => {
      queue = queue.then(() => {
        const out = read(asked.want);
        port.postMessage({ block: asked.want, tracks: out }, out.map((t) => t.data.buffer));
      });
    };
    return;
  }
  if (data.close) await close();
};

let queue = Promise.resolve();
onmessage = ({ data }) => {
  queue = queue.then(() => handle(data)).catch((error) => postMessage({ failed: String(error) }));
};
`;

export interface TrackBlock {
  readonly channels: number;
  readonly scale: number;
  readonly data: Int16Array;
}

export interface TapeShape {
  readonly tracks: number;
  readonly frames: number;
}

export interface Tape {
  readonly frames: number;
  readonly blocks: number;
  readonly write: (
    track: number,
    left: Float32Array<ArrayBuffer>,
    right: Float32Array<ArrayBuffer>,
  ) => void;
  readonly block: (index: number) => Promise<readonly TrackBlock[]>;
  readonly port: () => MessagePort;
  readonly close: () => void;
}

const taggedError = Schema.TaggedError;

class TapeUnavailable extends taggedError<TapeUnavailable, { readonly brand: unique symbol }>()(
  "TapeUnavailable",
  { reason: Schema.String },
) {}

const OpenedSchema = Schema.Struct({ opened: Schema.Literals(["disk", "memory"]) });
const ReadSchema = Schema.Struct({ id: Schema.Finite, tracks: Schema.Array(Schema.Unknown) });

const openedOf = Schema.decodeUnknownOption(OpenedSchema);
const readOf = Schema.decodeUnknownOption(ReadSchema);

const deviceMemory = (): number => {
  const reported: unknown = Reflect.get(navigator, "deviceMemory");
  if (typeof reported === "number") {
    return reported;
  }
  return Number.POSITIVE_INFINITY;
};

const roomy = (): boolean => deviceMemory() >= LOW_MEMORY && !PHONE.test(navigator.userAgent);

const spawned = (): Worker => {
  const url = URL.createObjectURL(new Blob([WORKER], { type: "text/javascript" }));
  const worker = new Worker(url);
  URL.revokeObjectURL(url);
  return worker;
};

const transferOf = (
  left: Float32Array<ArrayBuffer>,
  right: Float32Array<ArrayBuffer>,
): readonly ArrayBuffer[] => {
  if (left.buffer === right.buffer) {
    return [left.buffer];
  }
  return [left.buffer, right.buffer];
};

const isTrackBlock = (track: unknown): track is TrackBlock =>
  typeof track === "object" && track !== null && "data" in track;

const blocksOf = (worker: Worker): ((index: number) => Promise<readonly TrackBlock[]>) => {
  const pending = new Map<number, (tracks: readonly TrackBlock[]) => void>();
  const asked = { next: 0 };
  worker.addEventListener("message", ({ data }) => {
    Option.map(readOf(data), ({ id, tracks }) => {
      Option.map(Option.fromUndefinedOr(pending.get(id)), (resolve) => {
        resolve(pipe(tracks, Arr.filter(isTrackBlock)));
      });
      pending.delete(id);
    });
  });
  return (index) =>
    Effect.runPromise(
      Effect.callback<readonly TrackBlock[]>((resume) => {
        asked.next += 1;
        pending.set(asked.next, (tracks) => {
          resume(Effect.succeed(tracks));
        });
        worker.postMessage({ read: index, id: asked.next }, []);
      }),
    );
};

const tapeOf = (worker: Worker, shape: TapeShape): Tape => ({
  frames: BLOCK_FRAMES,
  blocks: Math.ceil(shape.frames / BLOCK_FRAMES),
  write: (track, left, right) => {
    worker.postMessage({ write: track, left, right }, [...transferOf(left, right)]);
  },
  block: blocksOf(worker),
  port: () => {
    const channel = new MessageChannel();
    worker.postMessage({ connect: channel.port1 }, [channel.port1]);
    return channel.port2;
  },
  close: () => {
    worker.postMessage({ close: true }, []);
  },
});

const unavailable = (reason: string): TapeUnavailable => TapeUnavailable.make({ reason });

const opened = (worker: Worker, shape: TapeShape): Effect.Effect<string, TapeUnavailable> =>
  Effect.callback<string, TapeUnavailable>((resume) => {
    worker.addEventListener(
      "message",
      ({ data }) => {
        resume(
          Option.match(openedOf(data), {
            onNone: () => Effect.fail(unavailable("worker")),
            onSome: ({ opened: kind }) => Effect.succeed(kind),
          }),
        );
      },
      { once: true },
    );
    worker.addEventListener(
      "error",
      () => {
        resume(Effect.fail(unavailable("worker")));
      },
      { once: true },
    );
    worker.postMessage(
      { open: { tracks: shape.tracks, blocks: Math.ceil(shape.frames / BLOCK_FRAMES) } },
      [],
    );
  });

const tapeIn = Effect.fn("tape.open")(function* tapeIn(shape: TapeShape) {
  const worker = yield* Effect.try({
    try: spawned,
    catch: (cause) => unavailable(String(cause)),
  });
  const kind = yield* opened(worker, shape);
  if (kind === "memory" && !roomy()) {
    worker.terminate();
    return yield* unavailable("memory");
  }
  const tape = tapeOf(worker, shape);
  globalThis.addEventListener("pagehide", tape.close, { once: true });
  return tape;
});

export const openTape = (shape: TapeShape): Promise<Tape> => Effect.runPromise(tapeIn(shape));
