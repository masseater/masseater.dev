export const YEN = new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY" });

export const SIGNED_YEN = new Intl.NumberFormat("ja-JP", {
  style: "currency",
  currency: "JPY",
  signDisplay: "exceptZero",
});
