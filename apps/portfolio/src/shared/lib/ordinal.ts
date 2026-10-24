const ORDINAL_DIGITS = 2;

const ORDINAL_PAD = "0";

const ordinal = (value: number): string => String(value).padStart(ORDINAL_DIGITS, ORDINAL_PAD);

export { ordinal };
