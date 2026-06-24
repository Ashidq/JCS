"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { memo } from "react";
import { z } from "zod";
import { supabase } from "../../scan/supabase-logic";
import { HiUser, HiLockClosed, HiEye, HiEyeSlash } from "react-icons/hi2";
import { createAdminSession } from "../actions";

// ── Dipisah & di-memo agar tidak re-render setiap render parent ──
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
          .wave   { animation: wave  1.4s ease-in-out infinite; transform-origin: 533px 326px; }
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

          {/* Left arm (static) */}
          <rect x="325" y="316" width="38" height="90" rx="19" fill="#bee3f8" stroke="#bfdbfe" strokeWidth="1"/>
          <ellipse cx="345" cy="408" rx="18" ry="14" fill="#93c5fd"/>

          {/* Right arm (waving) */}
          <g className="wave">
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
          <text x="390" y="225" fontFamily="monospace" fontSize="14" fill="#4ade80" fontWeight="bold">{`> Welcome`}</text>
          <rect x="390" y="235" width="8" height="14" rx="1" fill="#4ade80" className="cursor"/>
          <text x="390" y="262" fontFamily="monospace" fontSize="10" fill="#22d3ee" opacity="0.8">waiting_payment...</text>

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

// ─── Zod Schema ────────────────────────────────────────────────────────────
const loginSchema = z.object({
  username: z
    .string()
    .min(3, "Username minimal 3 karakter")
    .max(50, "Username terlalu panjang")
    .regex(/^[a-zA-Z0-9_]+$/, "Username hanya boleh huruf, angka, dan underscore")
    .trim(),
  password: z
    .string()
    .min(6, "Password minimal 6 karakter")
    .max(100, "Password terlalu panjang"),
});

export default function AdminLoginPage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ username?: string; password?: string }>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setFieldErrors({});

    // ── Validasi Zod ──
    const result = loginSchema.safeParse({ username, password });
    if (!result.success) {
      const errs = result.error.flatten().fieldErrors;
      setFieldErrors({
        username: errs.username?.[0],
        password: errs.password?.[0],
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("admin")
        .select("*")
        .eq("username", result.data.username)
        .eq("password", result.data.password)
        .single();

      if (error || !data) {
        setErrorMsg("Username atau password salah!");
        return;
      }

      // Generate token sesi unik dan catat perangkat
      const sessionToken = crypto.randomUUID();
      const userAgent = navigator.userAgent;

      // Fire-and-forget — jangan blokir redirect jika gagal
      createAdminSession({
        username: result.data.username,
        token: sessionToken,
        userAgent,
      }).catch(() => {});

      localStorage.setItem("admin_session", result.data.username);
      localStorage.setItem("admin_session_token", sessionToken);
      router.push("/admin/dashboard");
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : "Terjadi kesalahan koneksi."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const inputCls =
    "w-full h-12 border border-gray-300 rounded-xl px-4 pl-11 bg-gray-50 text-gray-900 placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-[#2B4C7E] focus:border-transparent transition-all";

  return (
    // ── CONTAINER UTAMA dengan background animasi ──
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4">
      
      {/* ═══ BACKGROUND HALAMAN ANIMASI ═══ */}
      <div className="absolute inset-0 z-0 bg-gradient-to-br from-[#1a2a4a] via-[#2B4C7E] to-[#487ADB]">
        
        {/* Pola grid titik-titik halus (tekstur) */}
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `radial-gradient(circle at 20px 20px, rgba(255,255,255,0.15) 1px, transparent 1px)`,
            backgroundSize: '40px 40px',
          }}
        />

        {/* Lingkaran besar 1 - bergerak lambat */}
        <div 
          className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full bg-blue-400/20 blur-3xl animate-float-slow"
          style={{ animationDuration: '8s' }}
        />
        
        {/* Lingkaran besar 2 - bergerak berlawanan */}
        <div 
          className="absolute -bottom-40 -left-40 w-[600px] h-[600px] rounded-full bg-indigo-300/15 blur-3xl animate-float-reverse"
          style={{ animationDuration: '10s' }}
        />
        
        {/* Lingkaran besar 3 - berdenyut di tengah */}
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-purple-300/10 blur-3xl animate-pulse-slow"
          style={{ animationDuration: '6s' }}
        />

        {/* Lingkaran kecil melayang (float) - 4 buah */}
        <div 
          className="absolute top-20 left-10 w-12 h-12 rounded-full bg-blue-300/20 blur-xl animate-float-slow" 
          style={{ animationDelay: '0s', animationDuration: '7s' }} 
        />
        <div 
          className="absolute bottom-20 right-20 w-16 h-16 rounded-full bg-teal-300/20 blur-xl animate-float-reverse" 
          style={{ animationDelay: '1s', animationDuration: '9s' }} 
        />
        <div 
          className="absolute top-1/3 right-10 w-8 h-8 rounded-full bg-pink-300/20 blur-lg animate-float-slow" 
          style={{ animationDelay: '2s', animationDuration: '5s' }} 
        />
        <div 
          className="absolute bottom-1/4 left-1/4 w-10 h-10 rounded-full bg-yellow-200/10 blur-xl animate-float-reverse" 
          style={{ animationDelay: '0.5s', animationDuration: '6s' }} 
        />
      </div>

      {/* ── CARD LOGIN (tetap di atas) ── */}
      <div className="relative z-10 w-full max-w-4xl min-h-[500px] flex flex-row bg-white rounded-2xl shadow-2xl overflow-hidden">

        {/* ── Left Panel ── dengan background yang konsisten */}
        <div className="hidden md:flex w-[35%] relative overflow-hidden bg-gradient-to-br from-[#487ADB] to-[#2B4C7E]">
          
          {/* Dekorasi latar panel kiri (konsisten dengan background halaman) */}
          <div 
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: `radial-gradient(circle at 20px 20px, rgba(255,255,255,0.2) 1px, transparent 1px)`,
              backgroundSize: '40px 40px',
            }}
          />
          
          <div className="absolute -top-20 -left-20 w-72 h-72 rounded-full bg-white/10 blur-3xl animate-float-slow" style={{ animationDuration: '10s' }} />
          <div className="absolute -bottom-24 -right-16 w-80 h-80 rounded-full bg-blue-300/20 blur-3xl animate-float-reverse" style={{ animationDuration: '12s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-white/5 blur-3xl animate-pulse-slow" style={{ animationDuration: '8s' }} />

          {/* Mascot tetap di atas */}
          <div className="absolute inset-0 flex items-center justify-center z-10 transform scale-[2] lg:scale-[2.5] xl:scale-[3] -translate-x-16 md:-translate-x-18 lg:-translate-x-26 -translate-y-10">
            <RobotMascot/>
          </div>
        </div>

        {/* ── Right Panel ── */}
        <div className="w-full md:w-[65%] p-10 lg:p-14 bg-white flex flex-col justify-center">

          {/* Title */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-[#2B4C7E]">Selamat Datang!</h1>
          </div>

          {/* Error */}
          {errorMsg && (
            <div className="mb-5 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-medium">
              {errorMsg}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3">

            {/* Username */}
            <div className="relative">
              <HiUser className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 text-base pointer-events-none" />
              <input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => { setUsername(e.target.value); setFieldErrors((p) => ({ ...p, username: undefined })); setErrorMsg(""); }}
                required
                autoComplete="username"
                className={`${inputCls} ${fieldErrors.username ? "border-red-400 focus:ring-red-300" : ""}`}
              />
              {fieldErrors.username && (
                <p className="mt-1 text-xs text-red-500">{fieldErrors.username}</p>
              )}
            </div>

            {/* Password */}
            <div className="relative">
              <HiLockClosed className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 text-base pointer-events-none" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setFieldErrors((p) => ({ ...p, password: undefined })); setErrorMsg(""); }}
                required
                autoComplete="current-password"
                className={`${inputCls} pr-11 ${fieldErrors.password ? "border-red-400 focus:ring-red-300" : ""}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                tabIndex={-1}
                aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
              >
                {showPassword ? (
                  <HiEyeSlash className="text-base" />
                ) : (
                  <HiEye className="text-base" />
                )}
              </button>
              {fieldErrors.password && (
                <p className="mt-1 text-xs text-red-500">{fieldErrors.password}</p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 bg-[#2B4C7E] hover:bg-[#1a3561] text-white font-bold text-sm rounded-xl shadow-md hover:shadow-lg transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed tracking-widest"
            >
              {isLoading ? "Memproses..." : "LOGIN"}
            </button>

            {/* Kembali ke Halaman Utama */}
            <div className="mt-5 text-right">
              <Link
                href="/"
                className="text-sm text-gray-400 hover:text-[#2B4C7E] transition-colors duration-200"
              >
                ← Kembali
              </Link>
            </div>

          </form>
        </div>
      </div>

      {/* ═══ KEYFRAMES CSS untuk animasi ═══ */}
      <style jsx>{`
        @keyframes float-slow {
          0%, 100% { transform: translate(0, 0) scale(1); }
          25% { transform: translate(20px, -30px) scale(1.05); }
          50% { transform: translate(-10px, 20px) scale(0.95); }
          75% { transform: translate(30px, 10px) scale(1.02); }
        }
        @keyframes float-reverse {
          0%, 100% { transform: translate(0, 0) scale(1); }
          25% { transform: translate(-20px, 30px) scale(0.95); }
          50% { transform: translate(10px, -20px) scale(1.05); }
          75% { transform: translate(-30px, -10px) scale(1.02); }
        }
        @keyframes pulse-slow {
          0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.4; }
          50% { transform: translate(-50%, -50%) scale(1.1); opacity: 0.7; }
        }
        .animate-float-slow {
          animation: float-slow ease-in-out infinite;
        }
        .animate-float-reverse {
          animation: float-reverse ease-in-out infinite;
        }
        .animate-pulse-slow {
          animation: pulse-slow ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}