import { Match, Array as Arr, pipe } from "effect";
import { escapeText } from "entities/escape";

import { truthOf } from "./sample.ts";
import type { Document } from "./sample.ts";

const row = (left: string, right: string): string =>
  `<div class="row"><span>${escapeText(left)}</span><span>${escapeText(right)}</span></div>`;

const itemRows = (document: Document): string =>
  pipe(
    document.items,
    Arr.map((item) => row(`${item.name} ×${item.quantity}`, item.amount)),
    Arr.join(""),
  );

const totalRow = (document: Document): string =>
  `<div class="row total"><span>合計</span><span>${escapeText(truthOf({ document, field: "total" }))}</span></div>`;

const receiptBody = (document: Document): string =>
  pipe(
    [
      `<h1>${escapeText(truthOf({ document, field: "issuer" }))}</h1>`,
      `<p class="center">TEL ${escapeText(document.phone)}</p>`,
      `<p class="center">登録番号 ${escapeText(truthOf({ document, field: "registration" }))}</p>`,
      `<p>${escapeText(truthOf({ document, field: "issueDate" }))} ${escapeText(document.time)}</p>`,
      '<p class="center">領収書</p>',
      itemRows(document),
      "<hr>",
      row("小計", document.subtotal),
      row("（内消費税等 10%）", truthOf({ document, field: "tax" })),
      totalRow(document),
      row("お預り", document.paid),
      row("お釣り", document.change),
      '<p class="center">またのご来店をお待ちしております</p>',
    ],
    Arr.join(""),
  );

const invoiceBody = (document: Document): string =>
  pipe(
    [
      '<h1 class="title">請求書</h1>',
      `<div class="row"><span class="recipient">${escapeText(document.recipient)} 御中</span><span>発行日 ${escapeText(truthOf({ document, field: "issueDate" }))}</span></div>`,
      `<div class="issuer"><p>${escapeText(truthOf({ document, field: "issuer" }))}</p><p>登録番号 ${escapeText(truthOf({ document, field: "registration" }))}</p><p>TEL ${escapeText(document.phone)}</p></div>`,
      `<p class="lead">ご請求金額 ${escapeText(truthOf({ document, field: "total" }))}（税込）</p>`,
      `<p>お支払期限 ${escapeText(document.dueDate)}</p>`,
      '<div class="row head"><span>品目</span><span>金額</span></div>',
      itemRows(document),
      "<hr>",
      row("小計", document.subtotal),
      row("消費税（10%）", truthOf({ document, field: "tax" })),
      totalRow(document),
      "<p>振込先 みなと銀行 本店営業部 普通 1234567</p>",
    ],
    Arr.join(""),
  );

const NOISE =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

const degradation = (document: Document): string =>
  Match.value(document.condition).pipe(
    Match.when("clean", () => ""),
    Match.when(
      "degraded",
      () => `
    .sheet { transform: rotate(${document.tilt}deg); filter: blur(0.9px) contrast(0.7) brightness(1.05); }
    body::after { content: ""; position: fixed; inset: 0; pointer-events: none; opacity: 0.35; background-image: ${NOISE}; }`,
    ),
    Match.exhaustive,
  );

const bodyOf = (document: Document): string =>
  Match.value(document.kind).pipe(
    Match.when("receipt", () => receiptBody(document)),
    Match.when("invoice", () => invoiceBody(document)),
    Match.exhaustive,
  );

const htmlOf = (
  document: Document,
): string => `<!doctype html><html lang="ja"><head><meta charset="utf-8"><style>
    body { display: inline-block; margin: 0; padding: 24px; background: #f4f1ea; font-family: "${document.font}"; color: #222; }
    .sheet { background: #fff; padding: 20px; }
    .receipt { width: 300px; font-size: 14px; }
    .invoice { width: 640px; font-size: 15px; }
    h1 { font-size: 20px; text-align: center; margin: 0 0 8px; }
    .title { font-size: 28px; letter-spacing: 0.5em; }
    p { margin: 4px 0; }
    .center { text-align: center; }
    .row { display: flex; justify-content: space-between; margin: 3px 0; }
    .total { font-size: 18px; font-weight: bold; }
    .head { border-bottom: 1px solid #555; }
    .issuer { text-align: right; margin: 12px 0; }
    .lead { font-size: 20px; border-bottom: 2px solid #222; display: inline-block; }
    .recipient { font-size: 17px; text-decoration: underline; }
    ${degradation(document)}
  </style></head><body><div class="sheet ${document.kind}">${bodyOf(document)}</div></body></html>`;

export { htmlOf };
