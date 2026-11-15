import { Schema } from "effect";

const LedgerEntry = Schema.Struct({
  kind: Schema.Literals(["host", "worker", "repository"]),
  key: Schema.String,
});

const Ledger = Schema.Struct({ entries: Schema.Array(LedgerEntry) });

const Report = Schema.Struct({
  findings: Schema.Array(Schema.Struct({ fingerprint: Schema.String, line: Schema.String })),
});

const ReportOutcome = Schema.Struct({ notified: Schema.Boolean });

type LedgerEntryValue = typeof LedgerEntry.Type;

export { Ledger, LedgerEntry, Report, ReportOutcome };
export type { LedgerEntryValue };
