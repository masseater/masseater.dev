import { docReader } from "./doc.ts";
import { MAIL_READERS } from "./mbox.ts";
import { notebookReader } from "./notebook.ts";
import { imageReaderOf } from "./ocr.ts";
import type { OcrOptions } from "./ocr.ts";
import { OFFICE_READERS } from "./office.ts";
import { outlookReader } from "./outlook.ts";
import type { Reader } from "./parser.ts";
import { pdfReaderOf } from "./pdf.ts";
import { pptReader } from "./ppt.ts";
import { SPREADSHEET_READERS } from "./spreadsheet.ts";

const readersWith = (ocr: OcrOptions): readonly Reader[] => [
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

const DEFAULT_READERS = readersWith({});

export { DEFAULT_READERS, readersWith };
