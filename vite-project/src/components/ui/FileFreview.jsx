import { ArrowLeft, FileText, Image, Upload, X } from "lucide-react";

function FilePreview({ file, onRemove, onContinue }) {
  const isPdf = file.type === "application/pdf";
  const previewUrl = isPdf ? null : URL.createObjectURL(file);

  return (
    <div className="fixed inset-0 z-[200] overflow-y-auto bg-slate-50">
      <div className="mx-auto min-h-screen max-w-md pb-10">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
          <button
            onClick={onRemove}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-700"
          >
            <ArrowLeft size={20} />
          </button>

          <div className="text-center">
            <h1 className="font-bold text-slate-900">
              Preview Document
            </h1>

            <p className="text-xs text-slate-500">
              Check before scanning
            </p>
          </div>

          <div className="w-10" />
        </header>

        <div className="px-5 pt-6">
          {/* Preview */}
          <div className="flex min-h-[420px] items-center justify-center overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            {isPdf ? (
              <div className="flex flex-col items-center px-6 text-center">
                 <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-red-50 text-red-500">
                  <FileText size={38} />
                </div>

                 <h2 className="mt-5 text-lg font-bold text-slate-900">
                   PDF Document
                </h2>

                <p className="mt-2 break-all text-sm text-slate-500">
                   {file.name}
                 </p> 
               </div> 
            ) : (
              <img
                src={previewUrl}
                alt="Selected warranty document"
                className="max-h-[520px] w-full object-contain"
              />
            )}
          </div>

          {/* File info */}
          <div className="mt-5 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
              {isPdf ? <FileText size={21} /> : <Image size={21} />}
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">
                {file.name}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          </div>

          {/* Buttons */}
          <div className="mt-6 space-y-3">
            <button
              onClick={onContinue}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-4 text-sm font-semibold text-white shadow-lg transition active:scale-[0.98]"
            >
              Continue to Scan
              <Upload size={18} />
            </button>

            <button
              onClick={onRemove}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-sm font-semibold text-red-600 transition active:scale-[0.98]"
            >
              <X size={18} />
              Remove Document
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FilePreview;