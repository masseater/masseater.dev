import type { Song } from "@r_masseater/fumx-parser";
export declare const song: Song & {
  readonly title: "まどろみの窓";
  readonly samples: readonly [
  ];
  readonly kits: readonly [
    Song["kits"][number] & { readonly name: "kit" },
  ];
  readonly instruments: readonly [
    Song["instruments"][number] & { readonly name: "voice" },
    Song["instruments"][number] & { readonly name: "piano" },
    Song["instruments"][number] & { readonly name: "bass" },
  ];
  readonly buses: readonly [
    Song["buses"][number] & { readonly name: "plate" },
  ];
  readonly tracks: readonly [
    Song["tracks"][number] & { readonly name: "vocal" },
    Song["tracks"][number] & { readonly name: "piano" },
    Song["tracks"][number] & { readonly name: "bass" },
    Song["tracks"][number] & { readonly name: "drums" },
  ];
  readonly plugins: readonly [
  ];
};
