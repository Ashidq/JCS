"use client";

import { use, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import Header from "../../components/layout/Header";
import Footer from "../../components/layout/Footer";
import { memo } from "react";
import {
  getPublicImageUrl,
  saveOCRResult,
  updateBuktiStatus,
  updateTransactionFromOCR,
} from "../scan/supabase-logic";
import {
  performOCR,
  type OCRResult,
} from "../scan/ocr-logic";

// ============================================================
// TYPES
// ============================================================
type Step = 1 | 2 | 3;
interface StepInfo { label: string; description: string; }

const STEPS: Record<Step, StepInfo> = {
  1: { label: "Mendeteksi layar ponsel", description: "OpenCV memproses gambar..." },
  2: { label: "Membaca teks OCR",        description: "Tesseract.js mengekstrak teks..." },
  3: { label: "Memvalidasi transaksi",   description: "Menyimpan data ke database..." },
};

// ============================================================
// MASKOT
// ============================================================
const RobotMascot = memo(function RobotMascot() {
  return (
    <div className="select-none inline-flex flex-col items-center">
      <svg viewBox="0 0 680 520" xmlns="http://www.w3.org/2000/svg" className="w-24 sm:w-32 lg:w-48 h-auto">
        <style>{`
          @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
          @keyframes blink{0%,90%,100%{opacity:1}95%{opacity:0}}
          @keyframes pulse{0%,100%{r:4}50%{r:5.5}}
          .float{animation:float 2s ease-in-out infinite;transform-origin:340px 260px}
          .cursor{animation:blink 2.4s infinite}
          .dot-g{animation:pulse 2s infinite}
          .dot-y{animation:pulse 2.3s infinite}
        `}</style>
        <g className="float">
          <ellipse cx="435" cy="490" rx="80" ry="12" fill="#c8dcee" opacity="0.5"/>
          <rect x="372" y="310" width="136" height="100" rx="36" fill="#dbeafe"/>
          <rect x="372" y="310" width="136" height="100" rx="36" fill="none" stroke="#bfdbfe" strokeWidth="1.5"/>
          <rect x="396" y="330" width="88" height="58" rx="14" fill="#bfdbfe"/>
          <circle cx="418" cy="349" r="7" fill="#60a5fa"/><circle cx="418" cy="349" r="4" fill="#93c5fd"/>
          <circle cx="440" cy="349" r="7" fill="#34d399"/><circle cx="440" cy="349" r="4" fill="#6ee7b7"/>
          <circle cx="462" cy="349" r="7" fill="#f472b6"/><circle cx="462" cy="349" r="4" fill="#f9a8d4"/>
          <rect x="405" y="367" width="70" height="8" rx="4" fill="#93c5fd"/>
          <rect x="405" y="367" width="46" height="8" rx="4" fill="#676b6e"/>
          <rect x="325" y="316" width="38" height="90" rx="19" fill="#bee3f8" stroke="#bfdbfe"/>
          <ellipse cx="345" cy="408" rx="18" ry="14" fill="#93c5fd"/>
          <rect x="518" y="316" width="38" height="90" rx="19" fill="#bee3f8" stroke="#bfdbfe"/>
          <ellipse cx="537" cy="408" rx="18" ry="14" fill="#93c5fd"/>
          <rect x="340" y="160" width="200" height="152" rx="52" fill="#dbeafe"/>
          <rect x="340" y="160" width="200" height="152" rx="52" fill="none" stroke="#bfdbfe" strokeWidth="2"/>
          <rect x="322" y="210" width="30" height="50" rx="20" fill="#93c5fd" stroke="#bfdbfe"/>
          <rect x="527" y="210" width="30" height="50" rx="20" fill="#93c5fd" stroke="#bfdbfe"/>
          <rect x="372" y="188" width="136" height="88" rx="24" fill="#0f172a"/>
          <rect x="372" y="188" width="136" height="88" rx="24" fill="none" stroke="#1e40af" strokeWidth="1.5"/>
          <text x="390" y="225" fontFamily="monospace" fontSize="14" fill="#4ade80" fontWeight="bold">{`>OCR RUNNING`}</text>
          <rect x="390" y="235" width="8" height="14" rx="1" fill="#4ade80" className="cursor"/>
          <text x="390" y="265" fontFamily="monospace" fontSize="9" fill="#22d3ee">Processing...</text>
          <line x1="394" y1="164" x2="376" y2="118" stroke="#93c5fd" strokeWidth="3" strokeLinecap="round"/>
          <circle cx="374" cy="110" r="12" fill="#d1fae5" stroke="#6ee7b7" strokeWidth="2"/>
          <circle cx="374" cy="110" r="4" fill="#10b981" className="dot-g"/>
          <line x1="486" y1="164" x2="504" y2="118" stroke="#93c5fd" strokeWidth="3" strokeLinecap="round"/>
          <circle cx="506" cy="110" r="12" fill="#fef9c3" stroke="#fde047" strokeWidth="2"/>
          <circle cx="506" cy="110" r="4" fill="#eab308" className="dot-y"/>
        </g>
      </svg>
    </div>
  );
});

// ============================================================
// KOMPONEN KECIL: Baris data hasil OCR
// ============================================================
function ResultRow({
  label,
  value,
  mono = false,
  highlight = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5 border-b border-gray-100 last:border-0">
      <span className="text-xs text-gray-400 shrink-0 w-28">{label}</span>
      <span className={`text-xs text-right font-semibold break-all ${
        mono       ? "font-mono text-gray-600"
        : highlight ? "text-blue-700"
        : "text-gray-700"
      }`}>
        {value}
      </span>
    </div>
  );
}

// ============================================================
// KOMPONEN: Kartu Hasil OCR
// Menampilkan semua field yang berhasil dibaca
// ============================================================
function OCRResultCard({ result }: { result: OCRResult }) {
  const isFullValid = result.isSuccess;

  // Format tanggal ke bahasa Indonesia
  const formattedDate = result.transactionDate
    ? result.transactionDate.toLocaleString("id-ID", {
        day:    "2-digit",
        month:  "long",
        year:   "numeric",
        hour:   "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <div className={`rounded-2xl border p-4 space-y-1 ${
      isFullValid
        ? "bg-emerald-50 border-emerald-200"
        : "bg-yellow-50 border-yellow-200"
    }`}>
      {/* Badge status */}
      <div className="flex items-center gap-2 mb-3">
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
          isFullValid ? "bg-emerald-500 text-white" : "bg-yellow-400 text-white"
        }`}>
          {isFullValid ? "✅ Transaksi Terdeteksi" : "⏳ Data Tidak Lengkap"}
        </span>
      </div>

      {/* Data utama */}
      {result.amount !== null && (
        <ResultRow
          label="Nominal"
          value={`Rp${result.amount.toLocaleString("id-ID")}`}
          highlight
        />
      )}
      {result.merchantName && (
        <ResultRow label="Merchant" value={result.merchantName} />
      )}
      {formattedDate && (
        <ResultRow
          label="Tanggal & Waktu"
          value={formattedDate}
        />
      )}
      {result.paymentMethod && (
        <ResultRow label="Metode" value={result.paymentMethod} />
      )}

      {/* Transaction IDs — bisa lebih dari 1 */}
      {result.transactionIds.length > 0 && (
        <div className="pt-1">
          {result.transactionIds.map((tid, i) => (
            <ResultRow key={i} label={tid.label} value={tid.value} mono />
          ))}
        </div>
      )}

      {/* Validation errors dari OCR */}
      {result.validationErrors.length > 0 && (
        <div className="mt-2 space-y-1">
          {result.validationErrors.map((err, i) => (
            <div key={i} className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-1.5">
              X {err}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// PAGE
// ============================================================
export default function ProsesPage({
  searchParams,
}: {
  searchParams: Promise<{ id_bukti?: string; file_path?: string; public_url?: string }>;
}) {
  const router = useRouter();
  const { id_bukti, file_path, public_url } = use(searchParams);

  const [isCVReady, setIsCVReady]       = useState(false);
  const [cvTimeout, setCvTimeout]       = useState(false);
  const [currentStep, setCurrentStep]   = useState<Step>(1);
  const [isDone, setIsDone]             = useState(false);
  const [errorMsg, setErrorMsg]         = useState<string | null>(null);
  const [ocrResult, setOcrResult]       = useState<OCRResult | null>(null);
  const [isPendingStatus, setIsPendingStatus] = useState(false); // OCR gagal, perlu scan ulang

  const checkAndSetCVReady = useCallback(() => {
    const poll = setInterval(() => {
      if ((window as any).cv?.Mat) { clearInterval(poll); setIsCVReady(true); }
    }, 150);
    setTimeout(() => clearInterval(poll), 10_000);
  }, []);

  useEffect(() => {
    if ((window as any).cv?.Mat) { setIsCVReady(true); return; }
    checkAndSetCVReady();
  }, []); // eslint-disable-line

  useEffect(() => {
    const t = setTimeout(() => { if (!isCVReady) setCvTimeout(true); }, 5000);
    return () => clearTimeout(t);
  }, [isCVReady]);

  useEffect(() => {
    if (!isCVReady) return;
    if (!id_bukti || !file_path) { setErrorMsg("Parameter tidak lengkap. Kembali ke halaman scan."); return; }
    runPipeline();
  }, [isCVReady]); // eslint-disable-line

  const runPipeline = async () => {
    try {
      // ── STEP 1: Download gambar ──
      setCurrentStep(1);
      const cleanFilePath = file_path!.replace(/^\/+/, "");
      const imageUrl      = public_url || getPublicImageUrl(cleanFilePath);

      let response = await fetch(imageUrl, { cache: "no-store" });
      if (response.status === 400) {
        await new Promise((r) => setTimeout(r, 1000));
        response = await fetch(imageUrl, { cache: "no-store" });
      }
      if (!response.ok) throw new Error(`Gagal download gambar (${response.status})`);
      const blob = await response.blob();

      // ── STEP 2: OCR ──
      setCurrentStep(2);
      const result = await performOCR(blob);
      setOcrResult(result);

      // ── STEP 3: Simpan ke DB ──
      setCurrentStep(3);

      if (result.amount) {
        // Simpan semua data OCR yang berhasil dibaca
        await saveOCRResult(
          id_bukti!,
          result.rawText ?? "",
          result.amount,
          result.merchantName ?? null,
        );
        // Kirim transactionDate untuk validasi selisih waktu 5 menit
        const txUpdate = await updateTransactionFromOCR(
          id_bukti!,
          result.amount,
          result.merchantName ?? null,
          result.transactionDate ?? null,
        );

        // Tentukan status akhir berdasarkan validasi waktu + merchant
        const finalStatus = txUpdate?.validasiStatus ?? (result.isSuccess ? "Valid" : "Pending");

        setIsDone(true);

        if (result.isSuccess && finalStatus !== "Invalid") {
          // Redirect sukses dengan semua data OCR asli
          const params = new URLSearchParams({
            id_bukti:  id_bukti!,
            file_path: cleanFilePath,
            amount:    String(result.amount),
            merchant:  result.merchantName ?? "",
            status:    finalStatus,
            metode:    result.paymentMethod ?? "QRIS",
            tanggal:   result.transactionDate?.toISOString() ?? "",
            txids:     result.transactionIds.map((t) => `${t.label}:${t.value}`).join("|"),
          });
          setTimeout(() => router.push(`/hasil?${params.toString()}`), 2500);
        } else if (finalStatus === "Invalid") {
          // Selisih waktu > 5 menit → redirect dengan status Invalid
          const params = new URLSearchParams({
            id_bukti:   id_bukti!,
            file_path:  cleanFilePath,
            amount:     String(result.amount),
            merchant:   result.merchantName ?? "",
            status:     "Invalid",
            metode:     result.paymentMethod ?? "QRIS",
            tanggal:    result.transactionDate?.toISOString() ?? "",
            txids:      result.transactionIds.map((t) => `${t.label}:${t.value}`).join("|"),
            time_error: txUpdate?.timeValidation?.reason ?? "Selisih waktu melebihi 5 menit",
          });
          setTimeout(() => router.push(`/hasil?${params.toString()}`), 2500);
        } else {
          // Pending: amount terbaca tapi data lain tidak lengkap
          setIsPendingStatus(true);
        }
      } else {
        // OCR gagal membaca nominal → status Pending, tampilkan tombol Scan Ulang
        await saveOCRResult(id_bukti!, result.rawText ?? "", null, null);
        await updateBuktiStatus(id_bukti!, "invalid");
        setIsPendingStatus(true);
        setIsDone(true);
      }
    } catch (err: any) {
      console.error("❌ [Proses] Pipeline error:", err);
      setErrorMsg(err.message || "Terjadi kesalahan saat memproses.");
    }
  };

  const previewUrl = file_path
    ? getPublicImageUrl(file_path.replace(/^\/+/, ""))
    : "";

  // ── Tentukan apakah valid (untuk redirect & warna UI) ──
  const isFullValid = ocrResult?.isSuccess ?? false;

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Script src="/opencv.js" strategy="afterInteractive" onLoad={checkAndSetCVReady} />

      {/* HEADER */}
      <Header stepper="scan" />

      {/* MAIN */}
      <main className="flex-grow flex items-center justify-center px-6 py-10 pb-28">
        <div className="w-full max-w-4xl grid lg:grid-cols-2 gap-16 items-center">

          {/* KOLOM KIRI — mockup smartphone */}
          <div className="flex flex-col items-center gap-5">
            <div className="relative w-44 h-80 bg-gray-900 rounded-[2rem] border-4 border-gray-700 shadow-2xl overflow-hidden">
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-16 h-3 bg-gray-800 rounded-full z-10" />
              {previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewUrl} alt="Preview struk" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                  <svg className="w-10 h-10 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
            </div>

            {/* Pill status gambar */}
            <div className="flex items-center gap-2 bg-green-500 text-white text-xs font-bold px-4 py-2 rounded-full shadow">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
              Gambar berhasil ditangkap
            </div>

            {/* Maskot — di bawah smartphone di mobile, pojok kanan bawah di desktop */}
            <div className="lg:hidden">
              <RobotMascot />
            </div>
          </div>

          {/* KOLOM KANAN — progress + hasil */}
          <div className="flex flex-col gap-6">
            <div>
              <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full ${
                isDone && isPendingStatus ? "bg-yellow-100 text-yellow-600"
                : isDone    ? "bg-green-100 text-green-600"
                : errorMsg  ? "bg-red-100 text-red-600"
                : "bg-blue-100 text-blue-600"
              }`}>
                <div className={`w-1.5 h-1.5 rounded-full ${
                  isDone && isPendingStatus ? "bg-yellow-500"
                  : isDone     ? "bg-green-500"
                  : errorMsg ? "bg-red-500"
                  : "bg-blue-500 animate-pulse"
                }`} />
                {isDone && isPendingStatus ? "Data tidak terbaca" : isDone ? "Selesai diproses" : errorMsg ? "Terjadi kesalahan" : "Sedang memproses..."}
              </span>
              <h1 className="text-2xl font-black text-blue-900 mt-2">Memproses Pembayaran</h1>
              <p className="text-sm text-gray-400 mt-1">
                Sistem OCR menganalisis struk dan memverifikasi transaksi Anda.
              </p>
            </div>

            {/* Vertical Progress Timeline */}
            <div className="flex flex-col">
              {(Object.entries(STEPS) as [string, StepInfo][]).map(([key, step], idx) => {
                const stepNum    = Number(key) as Step;
                const isActive   = currentStep === stepNum && !isDone && !errorMsg;
                const isDoneStep = isDone ? true : currentStep > stepNum;
                const isPending  = !isDone && currentStep < stepNum;
                const isLast     = idx === Object.keys(STEPS).length - 1;

                return (
                  <div key={key} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 transition-all ${
                        isDoneStep ? "bg-emerald-500 text-white"
                        : isActive ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-400"
                      }`}>
                        {isDoneStep ? (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : isActive ? (
                          <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : stepNum}
                      </div>
                      {!isLast && (
                        <div className={`w-0.5 h-8 mt-1 ${isDoneStep ? "bg-emerald-300" : "bg-gray-200"}`} />
                      )}
                    </div>
                    <div className="pb-6 flex flex-col justify-center">
                      <span className={`text-sm font-semibold ${
                        isDoneStep ? "text-emerald-600" : isActive ? "text-blue-700" : "text-gray-400"
                      }`}>
                        {step.label}
                      </span>
                      {isActive   && <span className="text-xs text-gray-400 mt-0.5">{step.description}</span>}
                      {isDoneStep && <span className="text-xs text-emerald-500 mt-0.5">Selesai</span>}
                      {isPending  && <span className="text-xs text-gray-300 mt-0.5">Menunggu...</span>}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── HASIL OCR — tampil setelah isDone ── */}
            {isDone && !errorMsg && ocrResult && (
              <div className="space-y-3">
                <OCRResultCard result={ocrResult} />

                {/* Pending: OCR gagal baca data → tawarkan Scan Ulang */}
                {isPendingStatus && (
                  <div className="space-y-2">
                    <div className="flex items-start gap-2 bg-yellow-50 border border-yellow-200 rounded-xl px-3 py-2.5 text-xs text-yellow-700">
                      <svg className="w-4 h-4 mt-0.5 shrink-0 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                      </svg>
                      <span>
                        Data tidak terbaca dengan jelas. Silakan scan ulang bukti pembayaran Anda.
                        Pastikan gambar terang dan tidak buram.
                      </span>
                    </div>
                    <button
                      onClick={() => router.push("/scan")}
                      className="w-full mt-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 active:scale-95 transition-all"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Scan Ulang
                    </button>
                  </div>
                )}

                {/* Valid / Invalid: sedang redirect ke hasil */}
                {!isPendingStatus && (
                  <p className="text-xs text-emerald-500 text-center">
                    Mengalihkan ke halaman hasil...
                  </p>
                )}
              </div>
            )}

            {/* ── ERROR ── */}
            {errorMsg && (
              <div className="bg-red-50 border border-red-100 rounded-2xl p-4">
                <p className="text-sm font-semibold text-red-600">{errorMsg}</p>
                <button
                  onClick={() => router.push("/scan")}
                  className="mt-3 px-5 py-2 rounded-full bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors"
                >
                  Kembali ke Scan
                </button>
              </div>
            )}

            {/* ── CV TIMEOUT ── */}
            {!isDone && !errorMsg && cvTimeout && (
              <div className="bg-yellow-50 border border-yellow-100 rounded-2xl p-4">
                <p className="text-sm font-semibold text-yellow-700">⏱️ AI Engine belum merespons</p>
                <p className="text-xs text-yellow-500 mt-1">OpenCV.js gagal dimuat dalam 5 detik</p>
                <button
                  onClick={() => window.location.reload()}
                  className="mt-3 px-5 py-2 rounded-full bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors"
                >
                  Coba Lagi
                </button>
              </div>
            )}

            {/* ── LOADING ── */}
            {!isDone && !errorMsg && !cvTimeout && (
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                {!isCVReady ? "Memuat AI Engine..." : "Memproses..."}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* MASKOT — fixed pojok kanan bawah, hanya desktop */}
      <div className="hidden lg:block fixed bottom-20 right-6 z-40">
        <RobotMascot />
      </div>

      <footer className="fixed bottom-0 left-0 w-full z-50">
        <Footer />
      </footer>
    </div>
  );
}