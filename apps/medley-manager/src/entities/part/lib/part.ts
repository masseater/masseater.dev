type Named = Readonly<{ id: number; title: string }>;

type StaffRole = "audio" | "video" | "other";

type Credit = Readonly<{ role: StaffRole; person: Readonly<{ id: number; name: string }> }>;

type PartRow = Readonly<{
  id: number;
  position: number;
  label: string | null;
  bpm: string | null;
  bars: string | null;
  startSec: number | null;
  note: string | null;
  comment: string | null;
  song: Named | null;
  refVideo: Named | null;
  staff: readonly Credit[];
}>;

const STAFF_ROLE_LABEL: Readonly<Record<StaffRole, string>> = {
  audio: "音",
  video: "映",
  other: "他",
};

export type { Credit, Named, PartRow, StaffRole };
export { STAFF_ROLE_LABEL };
