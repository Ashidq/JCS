"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useEffect, useCallback } from "react";
import { uploadAndSaveTransaction } from "./supabase-logic";
import { performOCR } from "./ocr-logic"; 
import Footer from "../../components/layout/Footer";
import { CameraSection } from "./components/CameraSection";
import { TipsPanel } from "./components/TipsPanel";

declare global {
  interface Window {
    cv: any;
  }
}

export default function ScanPage() {
  const router = useRouter();
  const cameraRef = useRef<any>(null);

  const [isCapturing, setIsCapturing] = useState(false);
  const [isOpenCVReady, setIsOpenCVReady] = useState(false);
  const [status, setStatus] = useState("Menyiapkan Engine CV...");
  const [cameraPermission, setCameraPermission] = useState<"checking" | "granted" | "denied">("checking");

  const requestCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      stream.getTracks().forEach((track) => track.stop());
      setCameraPermission("granted");
      return true;
    } catch (error) {
      console.error("Akses kamera ditolak:", error);
      setCameraPermission("denied");
      setStatus("Akses Kamera Denied");
      return false;
    }
  };

  useEffect(() => {
    requestCamera();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (window.cv?.Mat) {
        setIsOpenCVReady(true);
        if (cameraPermission === "granted") setStatus("Kamera Aktif");
        clearInterval(interval);
      }
    }, 500);
    return () => clearInterval(interval);
  }, [cameraPermission]);

  /**
   * LOGIC: Handle Capture & OCR Processing
   */
  const onCapture = useCallback(async () => {
    if (isCapturing || cameraPermission !== "granted" || !isOpenCVReady) return;

    const blob = await cameraRef.current?.capture();
    if (!blob) return;

    setIsCapturing(true);
    setStatus("Menganalisis Teks (OCR)...");

    try {
      console.log("🚀 [OCR] Memulai ekstraksi teks lokal...");
      
      // 2. Ekstraksi Teks menggunakan Tesseract.js
      const ocrResult = await performOCR(blob);
      
      // --- DEBUG LOG UNTUK KONSOL ---
      console.log("📝 [OCR RAW]:", ocrResult.rawText);
      console.log("💰 [OCR AMOUNT]:", ocrResult.amount);
      console.log("🏢 [OCR MERCHANT]:", ocrResult.merchantName);

      if (ocrResult?.isSuccess) {
        setStatus(`✅ Terdeteksi Rp${ocrResult.amount?.toLocaleString('id-ID')}...`);
      } else {
        console.warn("⚠️ OCR gagal mendeteksi pola nominal.");
        setStatus(ocrResult.error || "Nominal tidak terbaca, menyimpan gambar...");
      }

      // 3. Simpan ke Supabase (Blob Gambar + Nominal hasil OCR)
      await uploadAndSaveTransaction(blob, ocrResult?.amount);

      setStatus("Berhasil! Mengalihkan...");

      setTimeout(() => {
        router.push("/");
        router.refresh();
      }, 2000);
    } catch (err) {
      console.error("❌ Gagal memproses bukti bayar:", err);
      setStatus("Gagal Simpan. Coba lagi.");
      setIsCapturing(false);
    }
  }, [isCapturing, cameraPermission, isOpenCVReady, router]);

  return (
    <div className="min-h-screen bg-[#F7F8FC] flex flex-col">
      <main className="flex-grow flex items-center justify-center px-6 py-8 pb-28">
        <div className="w-full max-w-7xl grid lg:grid-cols-[1fr_320px] gap-8">
          
          <CameraSection 
            cameraRef={cameraRef}
            status={status}
            isCapturing={isCapturing}
            isOpenCVReady={isOpenCVReady}
            cameraPermission={cameraPermission}
            onCapture={onCapture}
            onRetryPermission={requestCamera}
            onBack={() => router.back()}
          />

          <div className="flex flex-col gap-5">
            <TipsPanel />
            
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 mt-auto">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    System Engine
                  </span>
                  <span className="text-xs font-bold text-[#487ADB]">
                    {isCapturing ? "OCR PROCESSING" : "CV READY"}
                  </span>
                </div>

                <div
                  className={`px-3 py-1 rounded-full text-[10px] font-black tracking-widest border transition-all duration-500 ${
                    isOpenCVReady
                      ? "bg-green-50 text-green-600 border-green-100"
                      : "bg-yellow-50 text-yellow-600 border-yellow-100 animate-pulse"
                  }`}
                >
                  {isOpenCVReady ? "● CORE ACTIVE" : "○ INITIALIZING"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="fixed bottom-0 left-0 w-full z-50 bg-[#487ADB] text-white">
        <Footer />
      </footer>
    </div>
  );
}