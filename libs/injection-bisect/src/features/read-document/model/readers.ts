import type { Reader } from "#/entities/document/index.ts";

import { docReader } from "./doc.ts";
import { MAIL_READERS } from "./mbox.ts";
import { notebookReader } from "./notebook.ts";
import { imageReaderOf } from "./ocr.ts";
import type { OcrOptions } from "./ocr.ts";
import { OFFICE_READERS } from "./office.ts";
import { outlookReader } from "./outlook.ts";
import { pdfReaderOf } from "./pdf.ts";
import { pptReader } from "./ppt.ts";
import { SPREADSHEET_READERS } from "./spreadsheet.ts";

export const readersWith = (ocr: OcrOptions): readonly Reader[] => [
  pdfReaderOf(ocr),
  imageReaderOf(ocr),
  ...OFFICE_READERS,
  ...SPREADSHEET_READERS,
  notebookReader,
  outlookReader,
  docReader,
  pptReader,
  ...MAIL_READERS,
];

export const DEFAULT_READERS = readersWith({});
