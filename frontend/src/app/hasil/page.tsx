"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import Header from "../../components/layout/Header";    
import Footer from "../../components/layout/Footer";
import { memo } from "react";
import Image from "next/image";
import { ImCross } from "react-icons/im";
import { getPublicImageUrl } from "../scan/supabase-logic";

// ============================================================
// MASKOT — selebrasi
// ============================================================
const RobotMascot = memo(function RobotMascot() {
  return (
    <div className="select-none inline-flex flex-col items-center">
      <svg
        viewBox="0 0 680 520"
        xmlns="http://www.w3.org/2000/svg"
        /* Ukuran responsif: lebih kecil di mobile, normal di desktop */
        className="w-24 sm:w-32 lg:w-48 h-auto"
        aria-hidden="true"
      >
        <style>{`
          @keyframes float  { 0%,100%{transform:translateY(0)}   50%{transform:translateY(-6px)} }
          @keyframes blink  { 0%,90%,100%{opacity:1}             95%{opacity:0} }
          @keyframes pulse  { 0%,100%{r:4}                       50%{r:5.5} }
          @keyframes wave   { 0%,100%{transform:rotate(-10deg)}  50%{transform:rotate(14deg)} }
          .float  { animation: float 2s ease-in-out infinite; transform-origin: 340px 260px; }
          .cursor { animation: blink 2.4s infinite; }
          .dot-g  { animation: pulse 2s    infinite; }
          .dot-y  { animation: pulse 2.3s  infinite; }
          .waveRight   { animation: wave  1.4s ease-in-out infinite; transform-origin: 533px 326px; }
          .waveLeft   { animation: wave  1.4s ease-in-out infinite; transform-origin: 380px 326px; }
        `}</style>

        <g className="float">

          {/* Shadow */}
          <ellipse cx="435" cy="490" rx="80" ry="12" fill="#c8dcee" opacity="0.5"/>

          {/* Body */}
          <rect x="372" y="310" width="136" height="100" rx="36" fill="#dbeafe"/>
          <rect x="372" y="310" width="136" height="100" rx="36" fill="none" stroke="#bfdbfe" strokeWidth="1.5"/>
          <rect x="396" y="330" width="88"  height="58"  rx="14" fill="#bfdbfe"/>

          {/* Chest lights */}
          <circle cx="418" cy="349" r="7" fill="#60a5fa"/><circle cx="418" cy="349" r="4" fill="#93c5fd"/>
          <circle cx="440" cy="349" r="7" fill="#34d399"/><circle cx="440" cy="349" r="4" fill="#6ee7b7"/>
          <circle cx="462" cy="349" r="7" fill="#f472b6"/><circle cx="462" cy="349" r="4" fill="#f9a8d4"/>
          <rect x="405" y="367" width="70" height="8" rx="4" fill="#93c5fd"/>
          <rect x="405" y="367" width="70" height="8" rx="4" fill="#676b6e" />

          {/* Left arm (waving) */}
          <g className="waveLeft">
            <rect x="370" y="316" width="38" height="90" rx="19" fill="#bee3f8" stroke="#bfdbfe" strokeWidth="1" transform="rotate(-60 326 405)"/>
            <ellipse cx="390" cy="318" rx="18" ry="14" fill="#93c5fd" transform="rotate(-60 326 405)"/>
          </g>

          {/* Right arm (waving) */}
          <g className="waveRight">
            <rect x="470" y="150" width="38" height="90" rx="19" fill="#bee3f8" stroke="#bfdbfe" strokeWidth="1" transform="rotate(60 405 326)"/>
            <ellipse cx="490" cy="150" rx="18" ry="14" fill="#93c5fd" transform="rotate(60 405 326)"/>
          </g>

          {/* Head */}
          <rect x="340" y="160" width="200" height="152" rx="52" fill="#dbeafe"/>
          <rect x="340" y="160" width="200" height="152" rx="52" fill="none" stroke="#bfdbfe" strokeWidth="2"/>

          {/* Ears */}
          <rect x="322" y="210" width="30" height="50" rx="20" fill="#93c5fd" stroke="#bfdbfe" strokeWidth="1"/>
          <rect x="527" y="210" width="30" height="50" rx="20" fill="#93c5fd" stroke="#bfdbfe" strokeWidth="1"/>

          {/* Face screen */}
          <rect x="372" y="188" width="136" height="88" rx="24" fill="#0f172a"/>
          <rect x="372" y="188" width="136" height="88" rx="24" fill="none" stroke="#1e40af" strokeWidth="1.5"/>
          <text x="390" y="225" fontFamily="monospace" fontSize="14" fill="#4ade80" fontWeight="bold">{`>PAYMENT VALID`}</text>
          <rect x="390" y="235" width="8" height="14" rx="1" fill="#4ade80" className="cursor"/>
          <text x="390" y="262" fontFamily="monospace" fontSize="10" fill="#22d3ee" opacity="0.8">Success.</text>

          {/* Antena kiri */}
          <line x1="394" y1="164" x2="376" y2="118" stroke="#93c5fd" strokeWidth="3" strokeLinecap="round"/>
          <circle cx="374" cy="110" r="12" fill="#d1fae5" stroke="#6ee7b7" strokeWidth="2"/>
          <circle cx="374" cy="110" r="4" fill="#10b981" className="dot-g"/>

          {/* Antena kanan */}
          <line x1="486" y1="164" x2="504" y2="118" stroke="#93c5fd" strokeWidth="3" strokeLinecap="round"/>
          <circle cx="506" cy="110" r="12" fill="#fef9c3" stroke="#fde047" strokeWidth="2"/>
          <circle cx="506" cy="110" r="4"  fill="#eab308" className="dot-y"/>
        </g>
      </svg>
    </div>
  );
});

// ============================================================
// PAGE
// ============================================================
export default function HasilPage({
  searchParams,
}: {
  searchParams: Promise<{
    id_bukti?: string;
    file_path?: string;
    amount?: string;
    merchant?: string;
    status?: string;
    metode?: string;
    tanggal?: string;
    txids?: string;
    time_error?: string;
  }>;
}) {
  const router = useRouter();

  // ── DATA ASLI DARI OCR (bukan dummy) ──
  const { id_bukti, file_path, amount, merchant, status, metode, tanggal, txids, time_error } = use(searchParams);

  const nominalRaw       = Number(amount ?? 0);
  const nominalFormatted = nominalRaw > 0 ? `Rp ${nominalRaw.toLocaleString("id-ID")}` : "Rp -";
  const merchantName     = merchant || "-";
  const paymentMethod    = metode   || "QRIS";
  const txStatus         = status   || "Pending";
  const isValid          = txStatus === "Valid";
  const isInvalid        = txStatus === "Invalid";
  const isPending        = txStatus === "Pending";

  // Tanggal dari OCR (bukan generated baru)
  const txDate = tanggal
    ? new Date(tanggal).toLocaleString("id-ID", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : new Date().toLocaleString("id-ID", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });

  // ID Transaksi dari OCR
  const parsedTxIds = txids
    ? txids.split("|").map(s => { const [label, ...rest] = s.split(":"); return { label, value: rest.join(":") }; }).filter(t => t.value)
    : [];
  const primaryTxId = parsedTxIds[0]?.value ?? id_bukti ?? "-";

  const previewUrl = file_path ? getPublicImageUrl(file_path.replace(/^\/+/, "")) : "";

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="min-h-screen bg-white flex flex-col">

      {/* HEADER */}
      <Header stepper="scan" />
   
      {/* MAIN */}
      <main className="flex-grow flex items-center justify-center px-6 py-10 pb-28">
        <div className="w-full max-w-4xl grid lg:grid-cols-2 gap-16 items-center">

          {/* KOLOM KIRI — mockup phone dengan gambar OCR */}
          <div className="flex flex-col items-center gap-5">

            {/* Mockup phone — border warna sesuai status */}
            <div className={`border-2 rounded-3xl p-5 shadow-sm ${
              isValid   ? "border-emerald-500 shadow-emerald-100"
              : isInvalid ? "border-red-400 shadow-red-100"
              : "border-yellow-400 shadow-yellow-100"
            }`}>
              <div className="relative w-40 h-72 bg-gray-900 rounded-[2rem] border-4 border-gray-700 shadow-2xl overflow-hidden">

                {/* Notch */}
                <div className="absolute top-2 left-1/2 -translate-x-1/2 w-14 h-2.5 bg-gray-800 rounded-full z-20" />

                {previewUrl ? (
                  <>
                    {/* Gambar bukti pembayaran asli hasil scan */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={previewUrl}
                      alt="Bukti pembayaran hasil scan"
                      className="absolute inset-0 w-full h-full object-cover"
                    />

                    {/* Overlay: hijau jika valid, merah jika invalid, kuning jika pending */}
                    {isValid && (
                      <>
                        <div className="absolute inset-0 bg-emerald-600/65 backdrop-blur-[2px]" />
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-3 z-10">
                          <div className="w-10 h-10 rounded-full bg-emerald-400 flex items-center justify-center shadow-lg ring-4 ring-emerald-300/50">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                          <p className="text-white text-[9px] font-black text-center tracking-widest uppercase mt-1">
                            Pembayaran Valid
                          </p>
                          <p className="text-emerald-100 text-[8px] text-center font-semibold">{nominalFormatted}</p>
                        </div>
                      </>
                    )}

                    {isInvalid && (
                      <>
                        <div className="absolute inset-0 bg-red-600/65 backdrop-blur-[2px]" />
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-3 z-10">
                          <div className="w-10 h-10 rounded-full bg-red-400 flex items-center justify-center shadow-lg ring-4 ring-red-300/50">
                            <ImCross className="w-4 h-4 text-white" />
                          </div>
                          <p className="text-white text-[9px] font-black text-center tracking-widest uppercase mt-1">
                            Transaksi Invalid
                          </p>
                          <p className="text-red-100 text-[8px] text-center font-semibold">Waktu &gt; 5 menit</p>
                        </div>
                      </>
                    )}

                    {isPending && (
                      <>
                        <div className="absolute inset-0 bg-yellow-600/60 backdrop-blur-[2px]" />
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-3 z-10">
                          <div className="w-10 h-10 rounded-full bg-yellow-400 flex items-center justify-center shadow-lg ring-4 ring-yellow-300/50">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <p className="text-white text-[9px] font-black text-center tracking-widest uppercase mt-1">
                            Menunggu Verifikasi
                          </p>
                          <p className="text-yellow-100 text-[8px] text-center font-semibold">Pending</p>
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <div className="w-full h-full bg-gradient-to-b from-gray-800 to-gray-700 flex items-center justify-center text-white text-xs">
                    Belum ada gambar
                  </div>
                )}
              </div>
            </div>

            {/* Pill status */}
            <div className={`flex items-center gap-2 text-white text-xs font-bold px-4 py-2 rounded-full shadow ${
              isValid ? "bg-emerald-500" : isInvalid ? "bg-red-500" : "bg-yellow-500"
            }`}>
              {isValid ? (
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              ) : isInvalid ? (
                <ImCross className="w-3 h-3" />
              ) : (
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              {isValid ? "Bukti pembayaran valid" : isInvalid ? "Transaksi tidak valid" : "Menunggu verifikasi"}
            </div>
          </div>

          {/* KOLOM KANAN — detail & aksi (data asli OCR) */}
          <div className="flex flex-col gap-5">
            <div>
              <h2 className="text-2xl font-black text-blue-900">Detail Transaksi</h2>
              {/* Tanggal dari OCR, bukan waktu render halaman */}
              <p className="text-sm text-gray-400 mt-1">{txDate}</p>
            </div>

            {/* Nominal dari OCR */}
            <p className={`text-5xl font-black leading-none ${
              isValid ? "text-emerald-600" : isInvalid ? "text-red-500" : "text-yellow-500"
            }`}>{nominalFormatted}</p>

            {/* Notifikasi waktu invalid */}
            {isInvalid && time_error && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 text-xs text-red-700">
                <svg className="w-4 h-4 mt-0.5 shrink-0 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
                <span>{decodeURIComponent(time_error)}</span>
              </div>
            )}

            {/* Notifikasi pending */}
            {isPending && (
              <div className="flex items-start gap-2 bg-yellow-50 border border-yellow-200 rounded-xl px-3 py-2.5 text-xs text-yellow-700">
                <svg className="w-4 h-4 mt-0.5 shrink-0 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>OCR gagal membaca data. Scan ulang untuk memperbarui status menjadi Valid.</span>
              </div>
            )}

            {/* Tabel data asli dari OCR */}
            <div className="flex flex-col divide-y divide-gray-100">
              {[
                { label: "ID Transaksi",      value: primaryTxId },
                { label: "Merchant",          value: merchantName },
                { label: "Metode Pembayaran", value: paymentMethod },
                { label: "Status", value: (
                  <span className={`text-xs font-black px-3 py-1 rounded-full ${
                    isValid   ? "bg-emerald-100 text-emerald-600"
                    : isInvalid ? "bg-red-100 text-red-600"
                    : "bg-yellow-100 text-yellow-600"
                  }`}>
                    {isValid ? "✓ VALID" : isInvalid ? <span className="flex items-center gap-1"><ImCross className="w-2.5 h-2.5" /> INVALID</span> : "⏳ PENDING"}
                  </span>
                )},
                /* Tampilkan ID tambahan dari OCR jika ada */
                ...parsedTxIds.slice(1).map(t => ({ label: t.label, value: t.value })),
              ].map((row, i) => (
                <div key={i} className="flex justify-between items-center py-3">
                  <span className="text-xs text-gray-400">{row.label}</span>
                  {typeof row.value === "string"
                    ? <span className="text-xs font-bold text-blue-900 text-right max-w-[55%] break-all">{row.value}</span>
                    : row.value}
                </div>
              ))}
            </div>

            {/* Tombol aksi */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => router.push("/scan")}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl border-2 border-blue-600 text-blue-600 font-bold text-sm hover:bg-blue-50 active:scale-95 transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {isPending ? "Scan Ulang" : "Scan Lagi"}
              </button>
              <button
                onClick={() => router.push("/")}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-blue-600 text-white font-bold text-sm shadow-md shadow-blue-200 hover:bg-blue-700 active:scale-95 transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                Selesai
              </button>
            </div>
          </div>

        </div>
      </main>

      {/* MASKOT — fixed pojok kanan bawah */}
      <div className="fixed bottom-20 right-6 z-40">
        <RobotMascot />
      </div>

      <footer className="fixed bottom-0 left-0 w-full z-50">
        <Footer />
      </footer>
    </div>
  );
}
