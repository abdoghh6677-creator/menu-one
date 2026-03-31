import React, { useRef, useState, useEffect, useCallback } from "react";
import { buildImageUrl } from "../utils/uploadImage";

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  quality?: number;
  priority?: boolean;
  /** ارتفاع الـ skeleton (tailwind class مثل h-36) */
  skeletonClass?: string;
}

const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  className = "",
  width = 380,
  quality = 65,
  priority = false,
  skeletonClass = "h-36",
}) => {
  const [status, setStatus] = useState<"idle" | "loading" | "loaded" | "error">(priority ? "loading" : "idle");
  const [currentSrc, setCurrentSrc] = useState<string>("");
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const highQualityImgRef = useRef<HTMLImageElement | null>(null);

  // تحسين الحجم للموبايل
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const optimizedWidth = isMobile ? Math.min(width, 280) : width;
  const optimizedQuality = isMobile ? Math.max(quality - 15, 40) : quality;

  // Network-aware loading
  const getNetworkQuality = useCallback(() => {
    if (typeof navigator === 'undefined') return 'fast';
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    if (!connection) return 'fast';

    const effectiveType = connection.effectiveType;
    if (effectiveType === 'slow-2g' || effectiveType === '2g') return 'slow';
    if (effectiveType === '3g') return 'medium';
    return 'fast';
  }, []);

  const networkQuality = getNetworkQuality();
  const adjustedQuality = networkQuality === 'slow' ? Math.max(optimizedQuality - 20, 30) :
                          networkQuality === 'medium' ? Math.max(optimizedQuality - 10, 40) :
                          optimizedQuality;

  // Progressive loading: low quality first, then high quality
  const lowQualitySrc = buildImageUrl(src, Math.round(optimizedWidth * 0.3), 30);
  const highQualitySrc = buildImageUrl(src, optimizedWidth, adjustedQuality);

  // Check for AVIF support and use it if available (better compression than WebP)
  const supportsAvif = useCallback(() => {
    if (typeof window === 'undefined') return false;
    const canvas = document.createElement('canvas');
    return canvas.toDataURL('image/avif').indexOf('data:image/avif') === 0;
  }, []);

  const finalHighQualitySrc = supportsAvif()
    ? highQualitySrc.replace('format=webp', 'format=avif')
    : highQualitySrc;

  useEffect(() => {
    if (priority) {
      setCurrentSrc(finalHighQualitySrc);
      return;
    }

    const el = imgRef.current;
    if (!el) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          // Start with low quality image
          setCurrentSrc(lowQualitySrc);
          setStatus("loading");
          observerRef.current?.disconnect();
        }
      },
      { rootMargin: "200px" }
    );

    observerRef.current.observe(el);
    return () => observerRef.current?.disconnect();
  }, [priority, lowQualitySrc, finalHighQualitySrc]);

  // Load high quality image after low quality loads
  useEffect(() => {
    if (status === "loaded" && currentSrc === lowQualitySrc && !priority) {
      highQualityImgRef.current = new Image();
      highQualityImgRef.current.onload = () => {
        setCurrentSrc(finalHighQualitySrc);
      };
      highQualityImgRef.current.src = finalHighQualitySrc;
    }
  }, [status, currentSrc, lowQualitySrc, finalHighQualitySrc, priority]);

  // Memory cleanup for off-screen images
  useEffect(() => {
    if (!priority) {
      const el = imgRef.current;
      if (!el) return;

      const cleanupObserver = new IntersectionObserver(
        (entries) => {
          if (!entries[0].isIntersecting) {
            // Image is off-screen, cleanup memory
            setTimeout(() => {
              if (highQualityImgRef.current) {
                highQualityImgRef.current.src = '';
                highQualityImgRef.current = null;
              }
              // Reset to low quality if not priority
              if (currentSrc === finalHighQualitySrc) {
                setCurrentSrc(lowQualitySrc);
              }
            }, 5000); // Wait 5 seconds before cleanup
          }
        },
        { rootMargin: "1000px" } // Cleanup when 1000px off-screen
      );

      cleanupObserver.observe(el);
      return () => cleanupObserver.disconnect();
    }
  }, [priority, currentSrc, finalHighQualitySrc, lowQualitySrc]);

  // Memory cleanup on unmount
  useEffect(() => {
    return () => {
      if (highQualityImgRef.current) {
        highQualityImgRef.current.src = '';
        highQualityImgRef.current = null;
      }
    };
  }, []);

  return (
    <div ref={imgRef} className={`relative overflow-hidden ${skeletonClass} ${className}`}>
      {/* Blur placeholder - أسرع وأقل استهلاك */}
      {status === "loading" && currentSrc === lowQualitySrc && (
        <img
          src={lowQualitySrc}
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-40 blur-sm"
          aria-hidden="true"
          loading="eager"
        />
      )}

      {/* Skeleton أبسط */}
      {status !== "loaded" && status !== "error" && (
        <div className="absolute inset-0 bg-gray-100" />
      )}

      {/* الصورة الفعلية */}
      {currentSrc && (
        <img
          src={currentSrc}
          alt={alt}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            status === "loaded" ? "opacity-100" : "opacity-0"
          }`}
          onLoad={() => setStatus("loaded")}
          onError={() => setStatus("error")}
          decoding="async"
          fetchPriority={priority ? "high" : "low"}
          loading={priority ? "eager" : "lazy"}
        />
      )}

      {/* خطأ في التحميل */}
      {status === "error" && (
        <div className="absolute inset-0 bg-gray-50 flex items-center justify-center">
          <span className="text-gray-300 text-2xl">🍽️</span>
        </div>
      )}
    </div>
  );
};

export default LazyImage;
