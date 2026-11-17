import type { Song } from "@r_masseater/fumx-parser";
export declare const song: Song & {
  readonly title: "two five one";
  readonly samples: readonly [
    Song["samples"][number] & { readonly name: "break" },
  ];
  readonly kits: readonly [
    Song["kits"][number] & { readonly name: "studio" },
  ];
  readonly instruments: readonly [
    Song["instruments"][number] & { readonly name: "keys" },
    Song["instruments"][number] & { readonly name: "bass" },
  ];
  readonly buses: readonly [
    Song["buses"][number] & { readonly name: "room" },
  ];
  readonly tracks: readonly [
    Song["tracks"][number] & { readonly name: "drums" },
    Song["tracks"][number] & { readonly name: "keys" },
    Song["tracks"][number] & { readonly name: "bass" },
    Song["tracks"][number] & { readonly name: "loop" },
  ];
  readonly plugins: readonly [
  ];
};
