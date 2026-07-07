import { useCallback, useRef, useState } from "react";
import { FileWarning, UploadCloud } from "lucide-react";

interface UploadDropzoneProps {
  onFileSelected: (file: File) => void;
  error?: string | null;
}

export default function UploadDropzone({ onFileSelected, error }: UploadDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (fileList: FileList | null) => {
      const file = fileList?.[0];
      if (!file) return;
      onFileSelected(file);
    },
    [onFileSelected],
  );

  return (
    <div className="w-full">
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={`group relative flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed px-6 py-16 text-center transition-all duration-300 ${
          isDragging
            ? "border-emerald-500 bg-emerald-50 scale-[1.01]"
            : "border-slate-300 bg-white/60 hover:border-emerald-400 hover:bg-emerald-50/50"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-200 transition-transform duration-300 group-hover:scale-105">
          <UploadCloud className="h-10 w-10 text-white" strokeWidth={1.75} />
        </div>
        <h3 className="text-xl font-bold text-slate-800">اسحب وأفلت ملف PDF هنا</h3>
        <p className="mt-2 text-sm text-slate-500">أو اضغط لاختيار الملف من جهازك — يدعم العربية والإنجليزية وجميع اللغات</p>
        <span className="mt-6 inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors group-hover:bg-emerald-600">
          اختيار ملف PDF
        </span>
        <p className="mt-4 text-xs text-slate-400">تتم المعالجة بالكامل داخل متصفحك، ولا يتم رفع أي ملف إلى أي خادم</p>
      </div>

      {error && (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <FileWarning className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
