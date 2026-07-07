import { useCallback, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Archive,
  CheckCircle2,
  FileStack,
  FileText,
  Gauge,
  Images,
  Layers,
  Loader2,
  RotateCcw,
  Sparkles,
  Wand2,
} from "lucide-react";
import UploadDropzone from "./components/UploadDropzone";
import PageThumb from "./components/PageThumb";
import {
  buildCombinedPdf,
  buildImagesZip,
  formatBytes,
  loadPdfDocument,
  renderPdfPageToImage,
  sanitizeFileName,
  triggerBlobDownload,
  type ConvertedPage,
  type ImageFormat,
} from "./lib/pdfTools";
import type { PDFDocumentProxy } from "./lib/pdfWorker";

type Status = "idle" | "loading" | "ready" | "converting" | "done" | "error";

interface DpiPreset {
  value: number;
  label: string;
  desc: string;
}

const DPI_PRESETS: DpiPreset[] = [
  { value: 150, label: "عادية", desc: "150 DPI — مناسبة للعرض والمشاركة" },
  { value: 200, label: "عالية الجودة", desc: "200 DPI — توازن ممتاز بين الجودة والحجم" },
  { value: 300, label: "فائقة الدقة", desc: "300 DPI — جودة طباعة احترافية" },
  { value: 400, label: "احترافية قصوى", desc: "400 DPI — لأدق التفاصيل والنصوص" },
];

export default function App() {
  const [status, setStatus] = useState<Status>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [dpi, setDpi] = useState(300);
  const [format, setFormat] = useState<ImageFormat>("png");
  const [jpegQuality, setJpegQuality] = useState(0.92);
  const [pages, setPages] = useState<ConvertedPage[]>([]);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isZipping, setIsZipping] = useState(false);
  const [isBuildingPdf, setIsBuildingPdf] = useState(false);
  const cancelRef = useRef(false);

  const baseName = useMemo(() => (file ? sanitizeFileName(file.name) : "document"), [file]);
  const extension = format === "png" ? "png" : "jpg";

  const resetAll = useCallback(() => {
    cancelRef.current = true;
    setStatus("idle");
    setFile(null);
    setPdfDoc(null);
    setNumPages(0);
    setPages([]);
    setProgress({ current: 0, total: 0 });
    setErrorMsg(null);
  }, []);

  const handleFileSelected = useCallback(async (selected: File) => {
    const isPdf = selected.type === "application/pdf" || selected.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      setErrorMsg("الملف المختار ليس بصيغة PDF. الرجاء اختيار ملف بامتداد .pdf");
      return;
    }

    setErrorMsg(null);
    setStatus("loading");
    setFile(selected);
    setPages([]);

    try {
      const doc = await loadPdfDocument(selected);
      setPdfDoc(doc);
      setNumPages(doc.numPages);
      setStatus("ready");
    } catch (err) {
      console.error(err);
      setStatus("error");
      setErrorMsg(
        "تعذّرت قراءة هذا الملف. تأكد من أنه ملف PDF سليم وغير محمي بكلمة مرور ثم حاول مجددًا.",
      );
    }
  }, []);

  const handleConvert = useCallback(async () => {
    if (!pdfDoc) return;
    cancelRef.current = false;
    setStatus("converting");
    setPages([]);
    setProgress({ current: 0, total: numPages });

    const results: ConvertedPage[] = [];
    for (let i = 1; i <= numPages; i++) {
      if (cancelRef.current) return;
      try {
        const rendered = await renderPdfPageToImage(pdfDoc, i, dpi, format, jpegQuality);
        results.push(rendered);
        setPages([...results]);
        setProgress({ current: i, total: numPages });
      } catch (err) {
        console.error(`Failed rendering page ${i}`, err);
      }
      // Yield to the browser so the UI (progress bar) stays responsive.
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }

    if (!cancelRef.current) {
      setStatus("done");
    }
  }, [pdfDoc, numPages, dpi, format, jpegQuality]);

  const handleDownloadZip = useCallback(async () => {
    if (!pages.length) return;
    setIsZipping(true);
    try {
      const blob = await buildImagesZip(pages, format, baseName);
      triggerBlobDownload(blob, `${baseName}-صور.zip`);
    } catch (err) {
      console.error(err);
      setErrorMsg("حدث خطأ أثناء إنشاء ملف ZIP. حاول مرة أخرى.");
    } finally {
      setIsZipping(false);
    }
  }, [pages, format, baseName]);

  const handleDownloadCombinedPdf = useCallback(async () => {
    if (!pages.length) return;
    setIsBuildingPdf(true);
    try {
      const blob = await buildCombinedPdf(pages, format);
      triggerBlobDownload(blob, `${baseName}-مجمّع.pdf`);
    } catch (err) {
      console.error(err);
      setErrorMsg("حدث خطأ أثناء تجميع ملف PDF. حاول مرة أخرى.");
    } finally {
      setIsBuildingPdf(false);
    }
  }, [pages, format, baseName]);

  const totalOutputBytes = useMemo(() => pages.reduce((sum, p) => sum + p.sizeBytes, 0), [pages]);
  const progressPct = progress.total ? Math.round((progress.current / progress.total) * 100) : 0;
  const isBusy = status === "loading" || status === "converting";

  return (
    <div dir="rtl" lang="ar" className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-emerald-50/40 text-slate-900">
      {/* Header */}
      <header className="border-b border-slate-200/70 bg-white/70 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-md shadow-emerald-200">
              <FileStack className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-extrabold leading-tight text-slate-900">محوّل PDF إلى صور</h1>
              <p className="text-xs text-slate-500">تحويل، حفظ، وتجميع — بجودة عالية وفي المتصفح فقط</p>
            </div>
          </div>
          {file && (
            <button
              onClick={resetAll}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              بدء من جديد
            </button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        {!file && (
          <div className="mb-8 text-center">
            <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
              <Sparkles className="h-3.5 w-3.5" />
              يدعم اللغة العربية والإنجليزية وجميع اللغات
            </span>
            <h2 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">
              حوّل صفحات PDF إلى صور عالية الجودة
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-sm text-slate-500">
              ارفع ملف PDF، وستقوم الأداة بتحويل كل صفحة إلى صورة منفصلة بجودة تختارها أنت، مع
              إمكانية تحميل كل صورة على حدة، أو تحميل جميع الصور كمجلد مضغوط، أو تجميعها من جديد في
              ملف PDF واحد.
            </p>
          </div>
        )}

        {!file && <UploadDropzone onFileSelected={handleFileSelected} error={errorMsg} />}

        {status === "loading" && (
          <div className="mt-6 flex items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-6 py-8 text-slate-600 shadow-sm">
            <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
            جاري تحليل ملف PDF...
          </div>
        )}

        {file && status !== "loading" && (
          <div className="space-y-6">
            {/* File info card */}
            <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                  <FileText className="h-6 w-6" />
                </div>
                <div className="min-w-0">
                  <p className="truncate font-bold text-slate-800">{file.name}</p>
                  <p className="text-xs text-slate-500">
                    {formatBytes(file.size)} · {numPages} صفحة
                  </p>
                </div>
              </div>
              {errorMsg && status === "error" && (
                <div className="flex items-center gap-2 text-sm font-medium text-red-600">
                  <AlertTriangle className="h-4 w-4" />
                  {errorMsg}
                </div>
              )}
            </div>

            {/* Settings */}
            {status !== "error" && (
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-800">
                  <Gauge className="h-4 w-4 text-emerald-600" />
                  إعدادات التحويل
                </div>

                <p className="mb-2 text-xs font-semibold text-slate-500">جودة الصورة (الدقة)</p>
                <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {DPI_PRESETS.map((preset) => (
                    <button
                      key={preset.value}
                      disabled={isBusy}
                      onClick={() => setDpi(preset.value)}
                      className={`rounded-xl border-2 px-3 py-2.5 text-right text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                        dpi === preset.value
                          ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                          : "border-slate-200 bg-white text-slate-600 hover:border-emerald-300"
                      }`}
                    >
                      <span className="block font-bold">{preset.label}</span>
                      <span className="mt-0.5 block text-[10px] text-slate-500">{preset.desc}</span>
                    </button>
                  ))}
                </div>

                <p className="mb-2 text-xs font-semibold text-slate-500">صيغة الصورة الناتجة</p>
                <div className="mb-2 flex flex-wrap gap-2">
                  <button
                    disabled={isBusy}
                    onClick={() => setFormat("png")}
                    className={`rounded-xl border-2 px-4 py-2 text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                      format === "png"
                        ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                        : "border-slate-200 bg-white text-slate-600 hover:border-emerald-300"
                    }`}
                  >
                    PNG — بدون فقدان الجودة (موصى به للنصوص)
                  </button>
                  <button
                    disabled={isBusy}
                    onClick={() => setFormat("jpeg")}
                    className={`rounded-xl border-2 px-4 py-2 text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                      format === "jpeg"
                        ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                        : "border-slate-200 bg-white text-slate-600 hover:border-emerald-300"
                    }`}
                  >
                    JPEG — حجم أصغر
                  </button>
                </div>

                {format === "jpeg" && (
                  <div className="mt-3 flex items-center gap-3">
                    <span className="text-xs font-semibold text-slate-500 shrink-0">جودة الضغط</span>
                    <input
                      type="range"
                      min={0.5}
                      max={1}
                      step={0.01}
                      value={jpegQuality}
                      disabled={isBusy}
                      onChange={(e) => setJpegQuality(Number(e.target.value))}
                      className="w-full accent-emerald-600"
                    />
                    <span className="w-12 shrink-0 text-xs font-bold text-slate-600">
                      {Math.round(jpegQuality * 100)}%
                    </span>
                  </div>
                )}

                <button
                  onClick={handleConvert}
                  disabled={isBusy}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-emerald-600 to-teal-600 py-3 text-sm font-extrabold text-white shadow-md shadow-emerald-200 transition-transform hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {status === "converting" ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      جاري التحويل... ({progress.current}/{progress.total})
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-4 w-4" />
                      {status === "done" ? "إعادة التحويل بالإعدادات الجديدة" : "بدء التحويل الآن"}
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Progress */}
            {status === "converting" && (
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-2 flex items-center justify-between text-xs font-semibold text-slate-600">
                  <span>جاري تحويل الصفحة {progress.current} من {progress.total}</span>
                  <span>{progressPct}%</span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-l from-emerald-500 to-teal-500 transition-all duration-200"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>
            )}

            {/* Results */}
            {pages.length > 0 && (
              <div className="space-y-4">
                <div className="flex flex-col gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2 text-sm font-bold text-emerald-800">
                    {status === "done" ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    )}
                    {pages.length} صورة جاهزة من أصل {numPages} — الحجم الإجمالي {formatBytes(totalOutputBytes)}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={handleDownloadZip}
                      disabled={isZipping || status === "converting"}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-sm transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isZipping ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Archive className="h-3.5 w-3.5" />}
                      تحميل كل الصور (ZIP)
                    </button>
                    <button
                      onClick={handleDownloadCombinedPdf}
                      disabled={isBuildingPdf || status === "converting"}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-white px-4 py-2 text-xs font-bold text-emerald-700 shadow-sm ring-1 ring-inset ring-emerald-300 transition-colors hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isBuildingPdf ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Layers className="h-3.5 w-3.5" />
                      )}
                      تجميع كملف PDF واحد
                    </button>
                  </div>
                </div>

                <div className="mb-1 flex items-center gap-2 text-sm font-bold text-slate-700">
                  <Images className="h-4 w-4 text-slate-500" />
                  معاينة الصفحات
                </div>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                  {pages.map((p) => (
                    <PageThumb key={p.pageNumber} page={p} baseName={baseName} extension={extension} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="mx-auto max-w-5xl px-6 pb-10 pt-4 text-center text-xs text-slate-400">
        جميع عمليات التحويل تتم محليًا داخل متصفحك — لا يتم رفع ملفاتك إلى أي خادم خارجي.
      </footer>
    </div>
  );
}
