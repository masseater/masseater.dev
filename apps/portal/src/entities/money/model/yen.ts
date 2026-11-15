const YEN = new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY" });

const SIGNED_YEN = new Intl.NumberFormat("ja-JP", {
  style: "currency",
  currency: "JPY",
  signDisplay: "exceptZero",
});

export const yen = (amount: number): string => YEN.format(amount);

export const signedYen = (amount: number): string => SIGNED_YEN.format(amount);
