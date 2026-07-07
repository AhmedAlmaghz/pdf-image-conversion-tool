import { GlobalWorkerOptions, getDocument, version } from "pdfjs-dist";
// Vite: resolves to a hashed, served URL for the worker bundle.
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";

GlobalWorkerOptions.workerSrc = workerSrc;

export { getDocument, version };
export type { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist";
