"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useEffect, useCallback } from "react";
import Footer from "../../components/layout/Footer";
import { CameraSection } from "./components/CameraSection";
import { getPublicImageUrl } from "./supabase-logic";

// ============================================================
// HELPERS — tidak diubah
// ============================================================
const API_URL = () => process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
const resetCaptureLock = () =>
  fetch(`${API_URL()}/reset-capture`, { method: "POST" }).catch(() => {});

// ============================================================
// TYPES — tidak diubah
// ============================================================
interface PreviewData {
  id_bukti: string;
  file_path: string;
  public_url: string;
  imageUrl: string;
}

// ============================================================
// SUB-COMPONENTS
// ============================================================
function PageStepper({ active }: { active: "scan" | "proses" | "hasil" }) {
  const steps = [
    { key: "scan",  label: "Scan"  },
    { key: "proses", label: "Proses" },
    { key: "hasil",  label: "Hasil"  },
  ];
  const activeIdx = steps.findIndex((s) => s.key === active);
  return (
    <div className="flex items-center gap-1">
      {steps.map((s, i) => (
        <div key={s.key} className="flex items-center gap-1">
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all ${
            i < activeIdx  ? "bg-blue-600 text-white" :
            i === activeIdx ? "bg-blue-100 text-blue-600 ring-2 ring-blue-300" :
                              "bg-gray-100 text-gray-400"
          }`}>
            {i < activeIdx && <span>✓</span>}
            {s.label}
          </div>
          {i < steps.length - 1 && (
            <div className={`w-5 h-0.5 ${i < activeIdx ? "bg-blue-600" : "bg-gray-200"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

function RobotMascot({ mood }: { mood: "scan" | "focus" }) {
  return (
    <div className="select-none inline-flex flex-col items-center">
      <div className="w-12 h-10 bg-white rounded-xl border-2 border-blue-200 shadow flex items-center justify-center relative">
        <span className="text-base font-black text-blue-600 tracking-widest">
          {mood === "scan" ? "o o" : "> <"}
        </span>
        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 w-1 h-2.5 bg-blue-400 rounded-full" />
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 w-2 h-2 bg-blue-500 rounded-full" />
        {mood === "scan" && (
          <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-400 rounded-full animate-ping opacity-75" />
        )}
      </div>
      <div className="w-9 h-7 bg-blue-50 border-2 border-blue-200 rounded-b-xl flex items-center justify-center mt-0.5">
        <div className="w-3.5 h-1 bg-blue-300 rounded-full" />
      </div>
    </div>
  );
}

// ============================================================
// PAGE
// ============================================================
export default function ScanPage() {
  const router = useRouter();
  const cameraRef = useRef<any>(null);

  // ── SEMUA STATE & LOGIKA DIPERTAHANKAN ──
  const [isCapturing, setIsCapturing] = useState(false);
  const isCapturingRef = useRef(false);

  const setIsCapturingSync = useCallback((val: boolean) => {
    isCapturingRef.current = val;
    setIsCapturing(val);
  }, []);

  const [isOpenCVReady, setIsOpenCVReady] = useState(false);
  const [status, setStatus] = useState("Menyiapkan Engine CV...");
  const [cameraPermission, setCameraPermission] = useState<"checking" | "granted" | "denied">("checking");
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);

  useEffect(() => { resetCaptureLock(); }, []);

  const requestCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      stream.getTracks().forEach((t) => t.stop());
      setCameraPermission("granted");
      return true;
    } catch {
      setCameraPermission("denied");
      setStatus("Akses Kamera Ditolak");
      return false;
    }
  }, []);

  useEffect(() => { requestCamera(); }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if ((window as any).cv?.Mat) {
        setIsOpenCVReady(true);
        if (cameraPermission === "granted") setStatus("📷 Kamera Aktif");
        clearInterval(interval);
      }
    }, 500);
    return () => clearInterval(interval);
  }, [cameraPermission]);

  const handleBackendResponse = useCallback(async (backendData: any) => {
    if (!backendData || !backendData.success) return;
    if (isCapturingRef.current) return;
    setIsCapturingSync(true);
    const { id_bukti, file_path, public_url } = backendData;
    if (!file_path || !id_bukti) { setIsCapturingSync(false); return; }
    const cleanFilePath = (file_path as string).replace(/^\/+/, "");
    const imageUrl = public_url || getPublicImageUrl(cleanFilePath);
    setPreviewData({ id_bukti: String(id_bukti), file_path: cleanFilePath, public_url: public_url ?? "", imageUrl });
    setStatus("📸 Foto berhasil diambil");
  }, [setIsCapturingSync]);

  const handleRetake = useCallback(() => {
    setPreviewData(null);
    setIsCapturingSync(false);
    setStatus("📷 Kamera Aktif");
    resetCaptureLock();
  }, [setIsCapturingSync]);

  const handleProceed = useCallback(() => {
    if (!previewData) return;
    const params = new URLSearchParams({
      id_bukti: previewData.id_bukti,
      file_path: previewData.file_path,
      public_url: previewData.public_url,
    });
    router.push(`/proses?${params.toString()}`);
  }, [previewData, router]);

  const onCapture = useCallback(() => {}, []);
  const onBack = useCallback(() => router.back(), [router]);

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="min-h-screen bg-white flex flex-col">

      {/* HEADER */}
      <header className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <span className="font-bold text-blue-900 text-sm">Jujurly Canteen System</span>
          </div>
          <PageStepper active="scan" />
          <span className="text-xs font-semibold text-blue-400">KWU • HMIT</span>
        </div>
        <div className="h-[3px] bg-blue-600" />
      </header>

      {/* MAIN */}
      <main className="flex-grow flex items-center justify-center px-6 py-8 pb-28">

        {previewData ? (
          /* ================================================
           * MODE B: PREVIEW
           * ============================================== */
          <div className="w-full max-w-4xl grid lg:grid-cols-2 gap-16 items-center">

            {/* Kolom kiri — mockup smartphone */}
            <div className="flex flex-col items-center gap-5">
              <div className="relative w-44 h-80 bg-gray-900 rounded-[2rem] border-4 border-gray-700 shadow-2xl overflow-hidden">
                <div className="absolute top-2 left-1/2 -translate-x-1/2 w-16 h-3 bg-gray-800 rounded-full z-10" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewData.imageUrl}
                  alt="Preview bukti pembayaran"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex items-center gap-2 bg-blue-600 text-white text-xs font-bold px-4 py-2 rounded-full shadow">
                <div className="w-2 h-2 bg-white rounded-full" />
                Gambar berhasil ditangkap
              </div>
            </div>

            {/* Kolom kanan — konfirmasi */}
            <div className="flex flex-col gap-6">
              <div>
                <span className="inline-flex items-center gap-1.5 bg-blue-100 text-blue-600 text-xs font-bold px-3 py-1.5 rounded-full">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                  Konfirmasi Foto
                </span>
                <h2 className="text-2xl font-black text-blue-900 mt-2">Periksa Kualitas Gambar</h2>
                <p className="text-sm text-gray-400 mt-1">
                  Pastikan teks nominal dan nama merchant terlihat jelas sebelum melanjutkan.
                </p>
              </div>

              {/* Tombol aksi */}
              <div className="flex gap-3">
                <button
                  onClick={handleRetake}
                  className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl border-2 border-blue-600 text-blue-600 font-bold text-sm hover:bg-blue-50 active:scale-95 transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Coba Foto Ulang
                </button>
                <button
                  onClick={handleProceed}
                  className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-blue-600 text-white font-bold text-sm shadow-md shadow-blue-200 hover:bg-blue-700 active:scale-95 transition-all"
                >
                  Foto Sudah Jelas
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

        ) : (
          /* ================================================
           * MODE A: KAMERA AKTIF
           * ============================================== */
          <div className="w-full max-w-4xl grid lg:grid-cols-[1fr_280px] gap-16 items-start">

            {/* Kolom kiri — camera frame */}
            <div className="flex flex-col gap-3">
              {/* Status pill + batal */}
              <div className="flex items-center justify-between">
                <div className={`inline-flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-full ${
                  isOpenCVReady ? "bg-blue-100 text-blue-600" : "bg-yellow-100 text-yellow-600"
                }`}>
                  <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${isOpenCVReady ? "bg-blue-500" : "bg-yellow-500"}`} />
                  {status}
                </div>
                <button onClick={onBack} className="text-xs text-gray-400 hover:text-gray-600 font-semibold transition-colors">
                  ✕ Batal
                </button>
              </div>

              {/* Camera frame */}
              <div className="relative bg-gray-900 rounded-3xl overflow-hidden shadow-2xl border-2 border-gray-800">
                {/* Corner accents */}
                <div className="absolute top-3 left-3 w-5 h-5 border-t-2 border-l-2 border-blue-400 rounded-tl-md z-10 pointer-events-none" />
                <div className="absolute top-3 right-3 w-5 h-5 border-t-2 border-r-2 border-blue-400 rounded-tr-md z-10 pointer-events-none" />
                <div className="absolute bottom-3 left-3 w-5 h-5 border-b-2 border-l-2 border-blue-400 rounded-bl-md z-10 pointer-events-none" />
                <div className="absolute bottom-3 right-3 w-5 h-5 border-b-2 border-r-2 border-blue-400 rounded-br-md z-10 pointer-events-none" />
                <CameraSection
                  cameraRef={cameraRef}
                  status={status}
                  isCapturing={isCapturing}
                  isOpenCVReady={isOpenCVReady}
                  cameraPermission={cameraPermission}
                  onCapture={onCapture}
                  onAutoCapture={handleBackendResponse}
                  onRetryPermission={requestCamera}
                  onBack={onBack}
                />
              </div>
            </div>

            {/* Kolom kanan — panduan */}
            <div className="flex flex-col gap-6">
              <div>
                <span className="inline-flex items-center gap-1.5 bg-blue-100 text-blue-600 text-xs font-bold px-3 py-1.5 rounded-full">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                  Scanning aktif
                </span>
                <h2 className="text-xl font-black text-blue-900 mt-2">Pindai Bukti Pembayaran</h2>
              </div>

              {/* Langkah vertikal minimalis */}
              <div className="flex flex-col">
                {[
                  { n: 1, title: "Dekatkan Struk QRIS ke Kamera",    desc: "Arahkan kamera ke struk bukti pembayaran" },
                  { n: 2, title: "Jaga Posisi Tetap Stabil",          desc: "Tahan agar gambar tidak buram" },
                  { n: 3, title: "Sistem Akan Menangkap Gambar Otomatis", desc: "Tunggu hingga auto-capture berjalan" },
                ].map((step, idx) => (
                  <div key={step.n} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-black shrink-0">
                        {step.n}
                      </div>
                      {idx < 2 && <div className="w-0.5 h-8 bg-blue-200 mt-1" />}
                    </div>
                    <div className="pb-5">
                      <p className="text-sm font-bold text-blue-900">{step.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Engine status */}
              <div className="flex items-center justify-between py-3 border-t border-gray-100">
                <span className="text-xs text-gray-400">System Engine</span>
                <div className={`px-2.5 py-1 rounded-full text-[10px] font-black border ${
                  isOpenCVReady
                    ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                    : "bg-yellow-50 text-yellow-600 border-yellow-100 animate-pulse"
                }`}>
                  {isOpenCVReady ? "● ACTIVE" : "○ LOADING"}
                </div>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* MASKOT — fixed pojok kanan bawah, ekspresi sesuai mode */}
      <div className="fixed bottom-20 right-6 z-40">
        <RobotMascot mood={previewData ? "focus" : "scan"} />
      </div>

      <footer className="fixed bottom-0 left-0 w-full z-50">
        <Footer />
      </footer>
    </div>
  );
}
