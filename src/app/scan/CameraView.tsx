"use client";

import {
  useRef,
  forwardRef,
  useImperativeHandle,
  useEffect,
} from "react";

import { useCameraCV } from "../../hooks/useCameraCV";
import { ScanOverlay } from "../../components/layout/ScanOverlay";

interface CameraViewProps {
  status: string;
  isCapturing: boolean;
  isCVReady: boolean;
  onAutoCapture?: () => void;
  onScanEvent?: (event: {
    type: "DETECTED" | "CAPTURING" | "IDLE";
    message?: string;
  }) => void;
}

export const CameraView = forwardRef((props: CameraViewProps, ref) => {
  // Canvas khusus untuk menangkap resolusi tinggi (OCR)
  const captureCanvasRef = useRef<HTMLCanvasElement>(null);

  const {
    videoRef,
    canvasRef, // Digunakan oleh useCameraCV untuk deteksi YOLO/Stability
    phoneBox,
  } = useCameraCV(
    props.isCVReady,
    props.isCapturing,
    props.onAutoCapture
  );

  // --- Realtime Notification Bridge ---
  useEffect(() => {
    if (!props.onScanEvent) return;
    if (props.isCapturing) {
      props.onScanEvent({
        type: "CAPTURING",
        message: "Menganalisis teks bukti bayar...",
      });
    }
  }, [props.isCapturing, props.onScanEvent]);

  useEffect(() => {
    if (!props.onScanEvent || !phoneBox) return;
    props.onScanEvent({
      type: "DETECTED",
      message: "Bukti bayar terdeteksi",
    });
  }, [phoneBox, props.onScanEvent]);

  /**
   * METHOD capture()
   * Dioptimalkan untuk menghasilkan gambar PNG High-Res.
   */
  useImperativeHandle(ref, () => ({
    // Di dalam useImperativeHandle pada CameraView.tsx
        capture: () => {
  const video = videoRef.current;
  const canvas = captureCanvasRef.current;

  // Pastikan video sudah memiliki dimensi yang valid
  if (!video || !canvas || video.videoWidth === 0) {
    console.error("📸 [CameraView] Video dimensions are 0. Capture aborted.");
    return null;
  }

  // 1. SET RESOLUSI BERDASARKAN SOURCE ASLI (Misal 1080p atau 4K)
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;

  // 2. PRE-PROCESSING RINGAN
  // Hilangkan filter yang terlalu ekstrem, cukup grayscale & sedikit kontras
  ctx.filter = "grayscale(1) contrast(1.1)";
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  ctx.filter = "none";

  console.log(`📸 [CameraView] Capturing at: ${canvas.width}x${canvas.height}`);

  // 3. PNG TANPA KOMPRESI (Agar teks tidak pecah)
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob((blob) => {
      resolve(blob);
    }, "image/png");
  });
},
  }));

  return (
    <div className="relative w-full h-[420px] rounded-2xl overflow-hidden bg-black shadow-inner">
      {/* VIDEO ELEMENT */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`absolute inset-0 w-full h-full object-cover -scale-x-100 transition-opacity duration-700 ${
          props.isCVReady ? "opacity-100" : "opacity-40"
        }`}
      />

      {/* HIDDEN CANVASES */}
      {/* Canvas 1: Untuk deteksi real-time di useCameraCV */}
      <canvas ref={canvasRef} className="hidden" /> 
      
      {/* Canvas 2: Untuk capture final kualitas tinggi */}
      <canvas ref={captureCanvasRef} className="hidden" />

      {/* OVERLAY UI */}
      <ScanOverlay
        isCapturing={props.isCapturing}
        status={props.status}
        isCVReady={props.isCVReady}
        phoneBox={phoneBox}
      />
    </div>
  );
});

CameraView.displayName = "CameraView";