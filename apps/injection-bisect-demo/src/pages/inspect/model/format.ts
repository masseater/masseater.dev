const percent = new Intl.NumberFormat("ja-JP", { style: "percent", maximumFractionDigits: 1 });

const dollars = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumSignificantDigits: 2,
});

const count = new Intl.NumberFormat("ja-JP");

const formatPercent = (value: number): string => percent.format(value);

const formatDollars = (value: number): string => dollars.format(value);

const formatCount = (value: number): string => count.format(value);

export { formatCount, formatDollars, formatPercent };
