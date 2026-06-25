"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useCallback } from "react";
import { VscServerProcess } from "react-icons/vsc";
import { TbLineScan } from "react-icons/tb";
import { AiOutlineFileDone } from "react-icons/ai";

// ============================================================
// PAGE STEPPER
// ============================================================
type StepperActive = "scan" | "proses" | "hasil";

function PageStepper({ active }: { active: StepperActive }) {
  const steps = [
    { key: "scan",   label: "Scan",   icon: TbLineScan },
    { key: "proses", label: "Proses", icon: VscServerProcess },
    { key: "hasil",  label: "Hasil",  icon: AiOutlineFileDone },
  ];

  const activeIdx = steps.findIndex((s) => s.key === active);

  return (
    <div className="flex items-center justify-center">
      {steps.map((step, i) => {
        const Icon        = step.icon;
        const isActive    = i === activeIdx;
        const isCompleted = i < activeIdx;

        return (
          <div key={step.key} className="flex items-center">
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${
                isActive      ? "bg-blue-100 border-blue-500 text-blue-600"
                : isCompleted ? "bg-blue-500 border-blue-500 text-white"
                : "bg-gray-100 border-gray-300 text-gray-400"
              }`}>
                {isCompleted ? (
                  <svg className="w-4 h-4" fill="none" stroke="white" strokeWidth={3} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <Icon size={18} />
                )}
              </div>
              <span className={`text-xs font-semibold mt-1 ${
                isActive || isCompleted ? "text-blue-600" : "text-gray-400"
              }`}>
                {step.label}
              </span>
            </div>

            {i < steps.length - 1 && (
              <div className={`w-16 h-[2px] mb-5 mx-1 ${
                i < activeIdx ? "bg-blue-500" : "bg-gray-300"
              }`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ============================================================
// HEADER
// Props:
//   stepper?      → tampilkan PageStepper di tengah
//   logoClickable → aktifkan 5 klik logo ke /admin/login
//                   (hanya untuk halaman utama)
// ============================================================
interface HeaderProps {
  stepper?:       StepperActive;
  logoClickable?: boolean;
}

export default function Header({ stepper, logoClickable = false }: HeaderProps) {
  const router     = useRouter();
  const clickCount = useRef(0);
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 5 klik logo dalam 2 detik → redirect ke /admin/login
  const handleLogoClick = useCallback(() => {
    if (!logoClickable) return;

    clickCount.current += 1;

    if (clickTimer.current) clearTimeout(clickTimer.current);

    if (clickCount.current >= 5) {
      clickCount.current = 0;
      router.push("/admin/login");
      return;
    }

    clickTimer.current = setTimeout(() => {
      clickCount.current = 0;
    }, 2000);
  }, [logoClickable, router]);

  const logoEl = (
    <Image
      src="/logo.png"
      alt="Logo Jujurly"
      width={15}
      height={20}
      className="object-contain"
    />
  );

  return (
    <header className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-5 py-3 flex items-center justify-between">

        {/* KIRI — Logo + Nama */}
        <div className="flex items-center gap-2">
          {logoClickable ? (
            <button
              onClick={handleLogoClick}
              className="w-9 h-9 sm:w-10 sm:h-10 bg-gray-100 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-105 hover:opacity-90 shadow-sm focus:outline-none"
              aria-label="Logo"
            >
              {logoEl}
            </button>
          ) : (
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gray-100 rounded-full flex items-center justify-center shadow-sm">
              {logoEl}
            </div>
          )}
          <span className="font-bold text-[#2B4C7E] text-base sm:text-lg">
            Jujurly Canteen System
          </span>
        </div>

        {/* TENGAH — Stepper (hanya jika prop stepper ada) */}
        {stepper && <PageStepper active={stepper} />}

        {/* KANAN — KWU HMIT */}
        <div className="text-sm font-bold text-[#2B4C7E] flex items-center gap-2">
          <span>KWU</span>
          <span className="text-yellow-400">●</span>
          <span>HMIT</span>
        </div>

      </div>
      <div className="h-[3px] bg-[#487ADB]" />
    </header>
  );
}
