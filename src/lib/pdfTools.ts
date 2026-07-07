import { getDocument, version } from "./pdfWorker";
import type { PDFDocumentProxy } from "./pdfWorker";

export type ImageFormat = "png" | "jpeg";

export interface ConvertedPage {
  pageNumber: number;
  dataUrl: string;
  /** Rendered pixel dimensions (depends on chosen DPI). */
  width: number;
  height: number;
  /** Original page size in PDF points (72dpi) - used to rebuild a PDF at the correct physical size. */
  baseWidth: number;
  baseHeight: number;
  sizeBytes: number;
}

const CMAP_URL = `https://unpkg.com/pdfjs-dist@${version}/cmaps/`;
const STANDARD_FONTS_URL = `https://unpkg.com/pdfjs-dist@${version}/standard_fonts/`;

/** Loads a PDF file selected/dropped by the user into a pdf.js document proxy. */
export async function loadPdfDocument(file: File): Promise<PDFDocumentProxy> {
  const buffer = await file.arrayBuffer();
  const loadingTask = getDocument({
    data: buffer,
    cMapUrl: CMAP_URL,
    cMapPacked: true,
    standardFontDataUrl: STANDARD_FONTS_URL,
    isEvalSupported: false,
  });
  return loadingTask.promise;
}

/** Converts a target DPI (dots per inch) into the scale factor pdf.js expects (72dpi = scale 1). */
export function dpiToScale(dpi: number): number {
  return dpi / 72;
}

/** Renders a single PDF page into a high quality raster image (data URL). */
export async function renderPdfPageToImage(
  pdf: PDFDocumentProxy,
  pageNumber: number,
  dpi: number,
  format: ImageFormat,
  jpegQuality = 0.92,
): Promise<ConvertedPage> {
  const page = await pdf.getPage(pageNumber);
  try {
    const baseViewport = page.getViewport({ scale: 1 });
    const scale = dpiToScale(dpi);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.ceil(viewport.width));
    canvas.height = Math.max(1, Math.ceil(viewport.height));
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) throw new Error("تعذر إنشاء سياق الرسم الخاص باللوحة (Canvas)");

    // White backdrop avoids black backgrounds on transparent PDFs, especially for JPEG output.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const renderTask = page.render({ canvasContext: ctx, viewport, canvas });
    await renderTask.promise;

    const mime = format === "png" ? "image/png" : "image/jpeg";
    const dataUrl = canvas.toDataURL(mime, format === "jpeg" ? jpegQuality : undefined);
    const base64Length = dataUrl.length - (dataUrl.indexOf(",") + 1);
    const sizeBytes = Math.ceil(base64Length * 0.75);

    canvas.width = 0;
    canvas.height = 0;

    return {
      pageNumber,
      dataUrl,
      width: viewport.width,
      height: viewport.height,
      baseWidth: baseViewport.width,
      baseHeight: baseViewport.height,
      sizeBytes,
    };
  } finally {
    page.cleanup();
  }
}

/** Bundles all converted page images into a single downloadable ZIP archive. */
export async function buildImagesZip(pages: ConvertedPage[], format: ImageFormat, baseName: string): Promise<Blob> {
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  const folder = zip.folder(baseName) ?? zip;
  const ext = format === "png" ? "png" : "jpg";
  const sorted = [...pages].sort((a, b) => a.pageNumber - b.pageNumber);

  for (const p of sorted) {
    const res = await fetch(p.dataUrl);
    const blob = await res.blob();
    const num = String(p.pageNumber).padStart(3, "0");
    folder.file(`${baseName}-page-${num}.${ext}`, blob);
  }

  return zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });
}

/** Re-assembles all page images into one combined PDF file, preserving each page's original physical size. */
export async function buildCombinedPdf(pages: ConvertedPage[], format: ImageFormat): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const sorted = [...pages].sort((a, b) => a.pageNumber - b.pageNumber);
  const first = sorted[0];
  const orientationOf = (w: number, h: number) => (w > h ? "l" : "p");

  const doc = new jsPDF({
    orientation: orientationOf(first.baseWidth, first.baseHeight),
    unit: "pt",
    format: [first.baseWidth, first.baseHeight],
    compress: true,
  });

  sorted.forEach((p, index) => {
    if (index > 0) {
      doc.addPage([p.baseWidth, p.baseHeight], orientationOf(p.baseWidth, p.baseHeight));
    }
    doc.addImage(
      p.dataUrl,
      format === "png" ? "PNG" : "JPEG",
      0,
      0,
      p.baseWidth,
      p.baseHeight,
      undefined,
      "FAST",
    );
  });

  return doc.output("blob");
}

export function formatBytes(bytes: number): string {
  if (!bytes) return "0 بايت";
  const units = ["بايت", "كيلوبايت", "ميغابايت", "جيغابايت"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export function sanitizeFileName(name: string): string {
  const withoutExt = name.replace(/\.pdf$/i, "");
  const cleaned = withoutExt.replace(/[\\/:*?"<>|]+/g, "-").trim();
  return cleaned.length ? cleaned : "document";
}

export function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function triggerDataUrlDownload(dataUrl: string, filename: string): void {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
