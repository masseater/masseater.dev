import type { Field } from "./fragment.ts";

const INVOICE_FIELDS = [
  { id: "issuer", label: "発行者", description: "この帳票を発行した会社や店の名前。宛名ではない" },
  { id: "issueDate", label: "発行日", description: "帳票を発行した日付。支払期限ではない" },
  { id: "total", label: "合計金額", description: "税込みの支払総額。小計やお預りではない" },
  { id: "tax", label: "消費税額", description: "合計に含まれる消費税の金額" },
  {
    id: "registration",
    label: "登録番号",
    description: "適格請求書発行事業者の登録番号。T で始まる 13 桁",
  },
] as const satisfies readonly Field[];

export { INVOICE_FIELDS };
