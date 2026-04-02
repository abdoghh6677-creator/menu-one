import { supabase } from "../config/supabase";

// ─── ضغط الصورة قبل الرفع ────────────────────────────────────────────────────
const compressImage = (file: File, maxWidth = 900, quality = 0.78): Promise<File> =>
  new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let { width, height } = img;
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob) { resolve(file); return; }
          if (blob.size >= file.size) { resolve(file); return; }
          resolve(new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" }));
        },
        "image/jpeg",
        quality
      );
    };
    img.onerror = () => { URL.revokeObjectURL(objectUrl); resolve(file); };
    img.src = objectUrl;
  });

// ─── بناء رابط مع Transformations ────────────────────────────────
export const buildImageUrl = (
  originalUrl: string,
  width = 600,
  quality = 75
): string => {
  if (!originalUrl) return originalUrl;

  // إذا الرابط لا يبدأ بـ http، افترض أنه اسم ملف من Cloudinary
  if (!originalUrl.startsWith('http')) {
    originalUrl = `${import.meta.env.VITE_CLOUDINARY_BASE_URL}/${originalUrl}`;
  }

  try {
    const url = new URL(originalUrl);
    // إذا الرابط من Cloudinary (يحتوي res.cloudinary.com)
    if (url.hostname === "res.cloudinary.com") {
      // أضف transformations تلقائية: f_auto,q_auto,w_{width}
      const pathParts = url.pathname.split("/upload/");
      if (pathParts.length === 2) {
        return `${url.origin}/upload/f_auto,q_auto,w_${width}/${pathParts[1]}`;
      }
    }
    // إذا الرابط من Supabase (روابط قديمة) - أرجعه كما هو
    if (url.pathname.includes("/storage/v1/object/public/")) {
      const renderUrl = originalUrl.replace(
        "/storage/v1/object/public/",
        "/storage/v1/render/image/public/"
      );
      return `${renderUrl}?width=${width}&quality=${quality}&format=webp`;
    }
  } catch { /* ignore */ }
  return originalUrl;
};

// ─── رفع الصورة إلى Cloudinary ──────────────────────────────────────────────
export const uploadMenuImage = async (file: File): Promise<string | null> => {
  if (!file.type.startsWith("image/")) throw new Error("يرجى اختيار ملف صورة صحيح");
  if (file.size > 10 * 1024 * 1024) throw new Error("حجم الصورة يجب أن يكون أقل من 10MB");

  const compressed = await compressImage(file);

  const formData = new FormData();
  formData.append("file", compressed);
  formData.append("upload_preset", "menu-images");

  try {
    console.log("Uploading to Cloudinary...");
    const response = await fetch("https://api.cloudinary.com/v1_1/dpjxle26o/image/upload", {
      method: "POST",
      body: formData,
    });
    const responseText = await response.text();
    console.log("Response:", response.status, responseText);

    if (!response.ok) {
      throw new Error("فشل رفع الصورة: " + response.statusText);
    }

    const data = JSON.parse(responseText);
    // Return the full secure URL from Cloudinary
    return data.secure_url;
  } catch (error) {
    console.error("Upload error:", error);
    throw error;
  }
};

// ─── حذف الصورة ──────────────────────────────────────────────────────────────
export const deleteMenuImage = async (imageUrl: string): Promise<void> => {
  try {
    const url = new URL(imageUrl);
    // إذا الرابط من Cloudinary: لا تفعل شيء (الحذف يتم من Dashboard)
    if (url.hostname === "res.cloudinary.com") {
      return;
    }
    // إذا الرابط من Supabase: نفس الكود الحالي
    const pathParts = url.pathname.split("/menu-images/");
    if (pathParts.length < 2) return;
    const filePath = pathParts[1].split("?")[0];
    await supabase.storage.from("menu-images").remove([filePath]);
  } catch { /* ignore */ }
};
