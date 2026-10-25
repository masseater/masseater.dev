type StarState =
  | Readonly<{ status: "found"; count: number; starred: boolean }>
  | Readonly<{ status: "missing" }>;

type StarView =
  | Readonly<{ status: "pending"; count: number }>
  | Exclude<StarState, Readonly<{ status: "missing" }>>;

const PENDING: StarView = { status: "pending", count: 0 };

const starView = (stars: StarState | undefined): StarView | Readonly<{ status: "missing" }> =>
  stars ?? PENDING;

const toggleStar =
  (starred: boolean) =>
  (current: StarState): StarState => {
    if (current.status === "missing") {
      return current;
    }
    return {
      status: "found",
      starred,
      count: current.count - Number(current.starred) + Number(starred),
    };
  };

export type { StarState, StarView };
export { starView, toggleStar };
