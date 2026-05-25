"use client";

import { useRouter } from "next/navigation";
import Script from "next/script";
import Image from "next/image";
import Footer from "../components/layout/Footer";

function RobotMascotWelcome() {
  return (
    <div className="relative select-none inline-flex flex-col items-center">
      <span className="absolute -top-4 -left-5 text-yellow-400 text-xl animate-bounce">★</span>
      <span className="absolute -top-2 -right-4 text-yellow-300 text-sm animate-bounce delay-100">✦</span>
      <span className="absolute top-3 -left-7 text-blue-300 text-xs animate-bounce delay-200">✦</span>
      <div className="w-16 h-14 bg-white rounded-2xl border-2 border-blue-300 shadow-md flex items-center justify-center relative">
        <span className="text-xl font-black text-blue-600 tracking-widest">^ ^</span>
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-1.5 h-4 bg-blue-400 rounded-full" />
        <div className="absolute -top-5 left-1/2 -translate-x-1/2 w-3 h-3 bg-blue-500 rounded-full" />
        <div className="absolute -right-5 top-2 text-lg animate-bounce">👋</div>
      </div>
      <div className="w-12 h-9 bg-blue-50 border-2 border-blue-200 rounded-b-2xl flex items-center justify-center mt-0.5">
        <div className="w-5 h-2 bg-blue-300 rounded-full" />
      </div>
    </div>
  );
}

export default function Home() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Script
        src="/opencv.js"
        strategy="afterInteractive"
        onLoad={() => {
          if ((window as any).cv?.onRuntimeInitialized !== undefined) {
            (window as any).cv.onRuntimeInitialized = () => {};
          }
        }}
      />

      {/* HEADER — konsisten dengan halaman lain */}
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
          <span className="text-xs font-semibold text-blue-400">KWU • HMIT</span>
        </div>
        <div className="h-[3px] bg-blue-600" />
      </header>

      {/* MAIN CONTENT */}
      <div className="flex-grow flex items-center justify-center px-6 py-10 pb-28">
        <div className="w-full max-w-4xl grid lg:grid-cols-2 gap-16 items-center">

          {/* ── KOLOM KIRI: QRIS Visual ── */}
          <div className="flex justify-center">
            <div className="bg-white p-4 rounded-3xl shadow-2xl border border-gray-100">
              <Image
                src="/Qris.PNG"
                alt="QRIS Payment"
                width={260}
                height={340}
                className="rounded-2xl"
                priority
              />
            </div>
          </div>

          {/* ── KOLOM KANAN: Teks & Aksi ── */}
          <div className="flex flex-col gap-6">
            {/* Badge */}
            <span className="inline-flex items-center gap-2 bg-blue-100 text-blue-600 text-xs font-bold px-3 py-1.5 rounded-full w-fit">
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
              Sistem Validasi Otomatis Berbasis AI
            </span>

            {/* Judul & deskripsi */}
            <div>
              <h1 className="text-4xl lg:text-5xl font-black text-blue-900 leading-tight">
                Jujurly Canteen<br />
                <span className="text-blue-600">System</span>
              </h1>
              <p className="text-gray-500 mt-4 text-base leading-relaxed">
                Verifikasi bukti pembayaran QRIS secara otomatis menggunakan Computer Vision dan OCR.
              </p>
            </div>

            {/* Tombol CTA */}
            <button
              onClick={() => router.push("/scan")}
              className="flex items-center justify-center gap-2 bg-blue-600 text-white font-bold py-4 px-8 rounded-2xl shadow-md shadow-blue-200 hover:bg-blue-700 active:scale-95 transition-all text-base w-full lg:w-auto"
            >
              Scan
            </button>
          </div>

        </div>
      </div>

      {/* ── MASKOT — fixed pojok kanan bawah, di atas footer ── */}
      <div className="fixed bottom-20 right-6 z-40">
        <RobotMascotWelcome />
      </div>

      <footer className="fixed bottom-0 left-0 w-full z-50">
        <Footer />
      </footer>
    </div>
  );
}
