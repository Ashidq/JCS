"use client";
import { CameraView } from "../CameraView";

interface CameraSectionProps {
  cameraRef: any;
  status: string;
  isCapturing: boolean;
  isOpenCVReady: boolean;
  cameraPermission: "checking" | "granted" | "denied";
  onCapture: () => void;

  // ⭐ TAMBAHAN (untuk auto mode dari Python)
  onAutoCapture?: (backendData: any) => void;

  onRetryPermission: () => void;
  onBack: () => void;
}

export const CameraSection = ({
  cameraRef,
  status,
  isCapturing,
  isOpenCVReady,
  cameraPermission,
  onAutoCapture,
  onBack
}: CameraSectionProps) => {
  return (
    <div className="bg-white rounded-[28px] shadow-lg p-2">
      <div className="rounded-[24px] overflow-hidden border border-gray-100 shadow-sm bg-black relative">
        <CameraView
          ref={cameraRef}
          status={status}
          isCapturing={isCapturing}
          isCVReady={isOpenCVReady}

          // ⭐ FIX: pakai handler dari page.tsx (BUKAN onCapture)
          onAutoCapture={onAutoCapture}
        />
      </div>

      <div className="flex justify-between items-center mt-5 px-4 pb-4">
        <button
          onClick={onBack}
          className="px-8 py-2 rounded-full border border-[#487ADB] text-[#487ADB] font-semibold text-sm hover:bg-blue-50 transition-colors"
        >
          ✕ Batal
        </button>

        <button
          disabled
          className="px-5 py-2.5 rounded-full font-semibold text-sm shadow-md bg-gray-300 text-gray-500 cursor-not-allowed"
        >
          {cameraPermission !== "granted"
            ? "Izinkan Kamera"
            : isCapturing
            ? "⌛ Memproses..."
            : !isOpenCVReady
            ? "⌛ Memuat OpenCV..."
            : "Scan"}
        </button>
      </div>
    </div>
  );
};