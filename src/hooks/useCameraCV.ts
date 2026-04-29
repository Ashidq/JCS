"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useCameraStream } from "./useCameraStream";
import { sendFrameToAPI } from "./useFrameSender";
import { useStability } from "./useStability";

interface PhoneBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const useCameraCV = (
  isCVReady: boolean,
  isCapturing: boolean,
  onAutoCapture?: () => void
) => {
  const router = useRouter();
  const { videoRef } = useCameraStream();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [phoneBox, setPhoneBox] = useState<PhoneBox | null>(null);

  const requestLockRef = useRef(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasCapturedRef = useRef(false);

  // =========================
  // 🔥 CAPTURE API
  // =========================
  const captureToAPI = async (canvas: HTMLCanvasElement) => {
    return new Promise<void>((resolve) => {
      canvas.toBlob(async (blob) => {
        if (!blob) return resolve();

        const formData = new FormData();
        formData.append("file", blob, "capture.jpg");

        try {
          console.log("📤 SENDING CAPTURE TO BACKEND...");
          const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
          
          const res = await fetch(`${API_URL}/capture-payment`, {
            method: "POST",
            body: formData,
          });

          const data = await res.json();
          console.log("📦 BACKEND CAPTURE RESULT:", data);
        } catch (err) {
          console.error("❌ BACKEND CAPTURE ERROR:", err);
        }
        resolve();
      }, "image/jpeg", 0.95);
    });
  };

  const stopAll = () => {
    console.log("🛑 STOP ALL CV LOOPS");
    hasCapturedRef.current = true;
    requestLockRef.current = true;

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  // =========================
  // 🔥 STABILITY TRIGGER (OCR & REDIRECT)
  // =========================
  const { update } = useStability(async () => {
    if (hasCapturedRef.current) return;

    console.log("📸 FINAL TRIGGER: STABLE PAYMENT DETECTED");
    stopAll();

    // 1. Simpan gambar ke Backend Python (YOLO Capture)
    if (canvasRef.current) {
      await captureToAPI(canvasRef.current);
    }

    // 2. Jalankan OCR & Supabase di Page.tsx
    // Kita berikan sedikit jeda agar UI status terupdate
    if (onAutoCapture) {
      console.log("🤖 TRIGGERING OCR PROCESSOR...");
      onAutoCapture();
    }

    // ⚠️ PERHATIAN: Jangan router.replace di sini jika onAutoCapture 
    // di page.tsx juga melakukan redirect. Biarkan page.tsx yang mengatur flow.
  });

  // =========================
  // SHARPNESS CALCULATION
  // =========================
  const getSharpness = (canvas: HTMLCanvasElement) => {
    // Tambahkan willReadFrequently: true untuk performa & hapus warning console
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return 0;

    const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);

    let sum = 0;
    for (let i = 0; i < data.length; i += 4) {
      const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      sum += gray;
    }
    return sum / (width * height);
  };

  // =========================
  // MAIN LOOP (DETECTION)
  // =========================
  useEffect(() => {
    if (!isCVReady || isCapturing) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const loop = async () => {
      if (
        hasCapturedRef.current ||
        requestLockRef.current ||
        !video ||
        video.videoWidth === 0 ||
        video.paused ||
        video.ended ||
        isCapturing
      ) return;

      requestLockRef.current = true;

      try {
        // Set resolusi canvas sesuai orientasi portrait mobile
        canvas.width = 720;
        canvas.height = 1280;

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const sharpness = getSharpness(canvas);

        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, "image/jpeg", 0.85) // Kualitas sedikit diturunkan untuk speed
        );

        if (!blob || hasCapturedRef.current) return;

        // Kirim ke API Deteksi (YOLO)
        const result = await sendFrameToAPI(blob);

        if (!result || hasCapturedRef.current) return;

        setPhoneBox(result.box || null);

        // Update stability tracker
        update(
          result.detected,
          result.confidence,
          result.box,
          sharpness
        );
      } catch (err) {
        // Silent error agar tidak polusi console saat re-loading backend
      } finally {
        requestLockRef.current = false;
      }
    };

    // Interval 500ms (2 FPS) cukup efisien untuk mobile browser
    intervalRef.current = setInterval(loop, 500);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isCVReady, isCapturing, update, videoRef]);

  return {
    videoRef,
    canvasRef,
    phoneBox,
  };
};