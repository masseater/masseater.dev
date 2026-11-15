import { Schema } from "effect";

export const LedgerEntry = Schema.Struct({
  kind: Schema.Literals(["host", "worker", "repository"]),
  key: Schema.String,
});

export const Ledger = Schema.Struct({ entries: Schema.Array(LedgerEntry) });

export const Report = Schema.Struct({
  findings: Schema.Array(Schema.Struct({ fingerprint: Schema.String, line: Schema.String })),
});

export const ReportOutcome = Schema.Struct({ notified: Schema.Boolean });

export type LedgerEntryValue = typeof LedgerEntry.Type;
