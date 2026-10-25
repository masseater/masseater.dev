type StarState =
  | Readonly<{ status: "found"; count: number; starred: boolean }>
  | Readonly<{ status: "missing" }>;

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

export type { StarState };
export { toggleStar };
