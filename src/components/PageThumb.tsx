import { Download } from "lucide-react";
import type { ConvertedPage } from "../lib/pdfTools";
import { formatBytes, triggerDataUrlDownload } from "../lib/pdfTools";

interface PageThumbProps {
  page: ConvertedPage;
  baseName: string;
  extension: string;
}

export default function PageThumb({ page, baseName, extension }: PageThumbProps) {
  const filename = `${baseName}-page-${String(page.pageNumber).padStart(3, "0")}.${extension}`;

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
      <div className="relative flex aspect-[3/4] items-center justify-center overflow-hidden bg-slate-100">
        <img
          src={page.dataUrl}
          alt={`صفحة رقم ${page.pageNumber}`}
          loading="lazy"
          className="h-full w-full object-contain"
        />
        <button
          onClick={() => triggerDataUrlDownload(page.dataUrl, filename)}
          className="absolute inset-x-0 bottom-0 flex translate-y-full items-center justify-center gap-2 bg-slate-900/85 py-2.5 text-sm font-semibold text-white backdrop-blur transition-transform duration-200 group-hover:translate-y-0"
        >
          <Download className="h-4 w-4" />
          تحميل الصورة
        </button>
      </div>
      <div className="flex items-center justify-between px-3 py-2 text-xs text-slate-500">
        <span className="font-semibold text-slate-700">صفحة {page.pageNumber}</span>
        <span>{formatBytes(page.sizeBytes)}</span>
      </div>
    </div>
  );
}
