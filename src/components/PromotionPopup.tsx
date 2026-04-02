import React, { useEffect, useState, useCallback } from "react";
import { X } from "lucide-react";
import type { Promotion } from "../services/restaurantService";

interface PromotionPopupProps {
  promotions: Promotion[];
  lang: "ar" | "en";
}

const PromotionPopup: React.FC<PromotionPopupProps> = ({ promotions, lang }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(100);
  const [closed, setClosed] = useState(false);

  const currentPromo = promotions[currentIndex];
  const duration = (currentPromo?.display_duration_seconds || 4) * 1000;

  const goNext = useCallback(() => {
    if (currentIndex < promotions.length - 1) {
      setCurrentIndex((i) => i + 1);
      setProgress(100);
    } else {
      setVisible(false);
      setClosed(true);
    }
  }, [currentIndex, promotions.length]);

  // Show popup after 300ms delay
  useEffect(() => {
    if (promotions.length === 0) return;
    const timer = setTimeout(() => setVisible(true), 300);
    return () => clearTimeout(timer);
  }, [promotions.length]);

  // Progress bar countdown
  useEffect(() => {
    if (!visible || closed) return;

    setProgress(100);
    const interval = 50; // ms
    const steps = duration / interval;
    const decrement = 100 / steps;

    const timer = setInterval(() => {
      setProgress((prev) => {
        const next = prev - decrement;
        if (next <= 0) {
          clearInterval(timer);
          goNext();
          return 0;
        }
        return next;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [visible, currentIndex, duration, goNext, closed]);

  if (!visible || closed || !currentPromo) return null;

  const title = lang === "ar"
    ? (currentPromo.title_ar || currentPromo.title)
    : (currentPromo.title || currentPromo.title_ar);

  const description = lang === "ar"
    ? (currentPromo.description_ar || currentPromo.description)
    : (currentPromo.description || currentPromo.description_ar);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
        onClick={goNext}
      >
        {/* Popup Card */}
        <div
          className="relative w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl"
          onClick={(e) => e.stopPropagation()}
          style={{ animation: "popupIn 0.3s ease-out" }}
        >
          {/* Close Button */}
          <button
            onClick={goNext}
            className="absolute top-3 right-3 z-10 w-9 h-9 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center transition-colors backdrop-blur-sm"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Counter (if multiple) */}
          {promotions.length > 1 && (
            <div className="absolute top-3 left-3 z-10 bg-black/50 text-white text-xs px-2.5 py-1 rounded-full backdrop-blur-sm">
              {currentIndex + 1} / {promotions.length}
            </div>
          )}

          {/* Promo Image */}
          <div className="relative w-full" style={{ aspectRatio: "9/16", maxHeight: "70vh" }}>
            <img
              src={
                currentPromo.image_url?.startsWith('http') 
                  ? currentPromo.image_url 
                  : `https://res.cloudinary.com/dpjxle26o/image/upload/${currentPromo.image_url}`
              }
              alt={title}
              className="w-full h-full object-cover"
            />

            {/* Gradient overlay for text */}
            {(title || description) && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-5 pt-16"
                dir={lang === "ar" ? "rtl" : "ltr"}>
                {title && (
                  <h3 className="text-white font-bold text-xl leading-tight mb-1 drop-shadow">{title}</h3>
                )}
                {description && (
                  <p className="text-white/90 text-sm drop-shadow">{description}</p>
                )}
              </div>
            )}
          </div>

          {/* Progress Bar */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
            <div
              className="h-full bg-white transition-none"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      <style>{`
        @keyframes popupIn {
          from { opacity: 0; transform: scale(0.92) translateY(10px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </>
  );
};

export default PromotionPopup;
