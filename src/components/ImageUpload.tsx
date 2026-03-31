import React, { useRef, useState } from "react";
import { Upload, X, Image, Loader, CheckCircle } from "lucide-react";
import { uploadMenuImage } from "../utils/uploadImage";

interface ImageUploadProps {
  currentUrl?: string;
  onUpload: (url: string) => void;
  onRemove?: () => void;
  label?: string;
}

const ImageUpload: React.FC<ImageUploadProps> = ({
  currentUrl,
  onUpload,
  onRemove,
  label = "صورة الصنف",
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStep, setUploadStep] = useState<"compressing" | "uploading" | "done" | "">("");
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<string>(currentUrl || "");
  const [dragOver, setDragOver] = useState(false);

  const handleFile = async (file: File) => {
    setError("");
    setUploading(true);
    setUploadStep("compressing");

    // معاينة فورية من الذاكرة المحلية
    const localPreview = URL.createObjectURL(file);
    setPreview(localPreview);

    try {
      setUploadStep("uploading");
      const url = await uploadMenuImage(file);
      if (url) {
        URL.revokeObjectURL(localPreview);
        onUpload(url);
        setPreview(url);
        setUploadStep("done");
        setTimeout(() => setUploadStep(""), 1500);
      }
    } catch (err: any) {
      setError(err.message || "فشل رفع الصورة");
      setPreview(currentUrl || "");
    } finally {
      setUploading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleRemove = () => {
    setPreview("");
    setError("");
    setUploadStep("");
    if (inputRef.current) inputRef.current.value = "";
    onRemove?.();
  };

  const stepLabel =
    uploadStep === "compressing" ? "ضغط الصورة..." :
    uploadStep === "uploading"   ? "جاري الرفع..."  :
    uploadStep === "done"        ? "تم الرفع ✓"     : "";

  return (
    <div className="space-y-2">
      <label className="label">{label}</label>

      {preview ? (
        <div className="relative w-full h-48 rounded-xl overflow-hidden bg-gray-100 group">
          <img
            src={preview}
            alt="معاينة"
            className="w-full h-full object-cover"
            onError={() => setPreview("")}
          />

          {/* شريط تقدم الرفع */}
          {uploading && (
            <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-2">
              <Loader className="w-8 h-8 text-white animate-spin" />
              <p className="text-white text-sm font-medium">{stepLabel}</p>
            </div>
          )}

          {/* رسالة نجاح */}
          {uploadStep === "done" && !uploading && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-green-400" />
            </div>
          )}

          {/* أزرار التعديل عند hover */}
          {!uploading && uploadStep !== "done" && (
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="bg-white text-gray-800 px-3 py-1.5 rounded-lg text-sm font-semibold hover:bg-gray-100 transition-colors flex items-center gap-1"
              >
                <Upload className="w-4 h-4" /> تغيير
              </button>
              <button
                type="button"
                onClick={handleRemove}
                className="bg-red-500 text-white px-3 py-1.5 rounded-lg text-sm font-semibold hover:bg-red-600 transition-colors flex items-center gap-1"
              >
                <X className="w-4 h-4" /> حذف
              </button>
            </div>
          )}
        </div>
      ) : (
        <div
          onClick={() => !uploading && inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`w-full h-48 rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all ${
            dragOver ? "border-accent bg-accent/5 scale-[1.01]" : "border-gray-300 hover:border-accent hover:bg-accent/5"
          } ${uploading ? "cursor-wait" : ""}`}
        >
          {uploading ? (
            <>
              <Loader className="w-10 h-10 text-accent animate-spin mb-2" />
              <p className="text-accent font-semibold text-sm">{stepLabel}</p>
            </>
          ) : (
            <>
              <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                <Image className="w-7 h-7 text-gray-400" />
              </div>
              <p className="font-semibold text-text text-sm mb-1">اضغط لاختيار صورة</p>
              <p className="text-text-secondary text-xs">أو اسحب الصورة هنا</p>
              <p className="text-text-secondary text-xs mt-1">PNG, JPG, WEBP — حتى 10MB</p>
              <p className="text-green-600 text-xs mt-1 font-medium">✦ يتم ضغط الصورة تلقائياً</p>
            </>
          )}
        </div>
      )}

      {error && (
        <p className="text-error text-sm flex items-center gap-1">
          <X className="w-4 h-4" /> {error}
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleInputChange}
        className="hidden"
      />
    </div>
  );
};

export default ImageUpload;
