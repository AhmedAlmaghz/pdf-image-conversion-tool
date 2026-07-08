import { Check, Download } from "lucide-react";
import type { ConvertedPage } from "../lib/pdfTools";
import { formatBytes, triggerDataUrlDownload } from "../lib/pdfTools";

interface PageThumbProps {
  page: ConvertedPage;
  baseName: string;
  extension: string;
  isSelected?: boolean;
  onToggleSelect?: () => void;
}

export default function PageThumb({ 
  page, 
  baseName, 
  extension, 
  isSelected = false, 
  onToggleSelect 
}: PageThumbProps) {
  const filename = `${baseName}-page-${String(page.pageNumber).padStart(3, "0")}.${extension}`;

  return (
    <div 
      className={`group relative overflow-hidden rounded-2xl border shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg ${
        isSelected 
          ? "border-emerald-500 ring-2 ring-emerald-200" 
          : "border-slate-200"
      }`}
    >
      {/* Selection Checkbox */}
      {onToggleSelect && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect();
          }}
          className={`absolute left-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-md transition-colors ${
            isSelected 
              ? "bg-emerald-500 text-white" 
              : "bg-white/80 text-slate-400 hover:bg-emerald-100 hover:text-emerald-600"
          }`}
          aria-label={isSelected ? "إلغاء اختيار الصفحة" : "اختيار الصفحة"}
        >
          {isSelected && <Check className="h-4 w-4" />}
        </button>
      )}
      
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