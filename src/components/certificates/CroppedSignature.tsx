"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from "react";

/**
 * Automatically crops transparent whitespace from signature assets.
 * Ensures that signatures with huge transparent paddings are normalized
 * to their actual visible content bounding box.
 */
export function CroppedSignature({ src, alt, className, style }: { src: string; alt: string; className?: string; style?: React.CSSProperties }) {
  const [croppedSrc, setCroppedSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!src) return;
    
    let isMounted = true;

    // Fast path for already-processed or missing
    const isDataUrl = src.startsWith("data:");
    const isLocal = src.startsWith("/");
    
    const img = new Image();
    if (!isDataUrl && !isLocal) {
      img.crossOrigin = "anonymous"; // Required for cross-origin storage images (Supabase Storage, CDN) to allow canvas read
    }
    
    img.onload = () => {
      if (!isMounted) return;
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) {
        setCroppedSrc(src);
        return;
      }
      
      ctx.drawImage(img, 0, 0);

      try {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        let minX = canvas.width, minY = canvas.height, maxX = 0, maxY = 0;
        let hasPixels = false;

        // Scan for non-transparent pixels to find true bounding box
        for (let y = 0; y < canvas.height; y++) {
          for (let x = 0; x < canvas.width; x++) {
            const alpha = data[(y * canvas.width + x) * 4 + 3];
            if (alpha > 10) { // Threshold for visibility
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;
              hasPixels = true;
            }
          }
        }

        if (!hasPixels) {
          setCroppedSrc(src);
          return;
        }

        const cropWidth = maxX - minX + 1;
        const cropHeight = maxY - minY + 1;

        // Add 2% padding around the cropped signature for breathing room
        const padX = Math.floor(cropWidth * 0.02);
        const padY = Math.floor(cropHeight * 0.02);

        const finalX = Math.max(0, minX - padX);
        const finalY = Math.max(0, minY - padY);
        const finalW = Math.min(canvas.width - finalX, cropWidth + padX * 2);
        const finalH = Math.min(canvas.height - finalY, cropHeight + padY * 2);

        const cropCanvas = document.createElement("canvas");
        cropCanvas.width = finalW;
        cropCanvas.height = finalH;
        const cropCtx = cropCanvas.getContext("2d");
        
        if (cropCtx) {
          cropCtx.drawImage(canvas, finalX, finalY, finalW, finalH, 0, 0, finalW, finalH);
          setCroppedSrc(cropCanvas.toDataURL("image/png"));
        } else {
          setCroppedSrc(src);
        }
      } catch (err) {
        console.warn("CORS issue cropping signature. Falling back to uncropped.", err);
        setCroppedSrc(src);
      }
    };
    
    img.onerror = () => {
      console.warn("Failed to load signature for cropping.");
      if (isMounted) setCroppedSrc(src);
    };
    
    img.src = src;
    
    return () => {
      isMounted = false;
    };
  }, [src]);

  return <img src={croppedSrc || src} alt={alt} className={className} style={{ ...style, opacity: croppedSrc ? 1 : 0.3, transition: "opacity 0.2s ease-in" }} />;
}
