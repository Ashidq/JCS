"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { memo } from "react";
import { z } from "zod";
import { supabase } from "../../scan/supabase-logic";
import { HiUser, HiLockClosed, HiEye, HiEyeSlash, HiArrowLeft } from "react-icons/hi2";

// ── Maskot ──────────────────────────────────────────────────────────────────
const RobotMascot = memo(function RobotMascot() {
  return (
    <div className="select-none inline-flex flex-col items-center">
      <svg
        viewBox="0 0 680 520"
        xmlns="http://www.w3.org/2000/svg"
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
          <ellipse cx="435" cy="490" rx="80" ry="12" fill="#c8dcee" opacity="0.5"/>
          <rect x="372" y="310" width="136" height="100" rx="36" fill="#dbeafe"/>
          <rect x="372" y="310" width="136" height="100" rx="36" fill="none" stroke="#bfdbfe" strokeWidth="1.5"/>
          <rect x="396" y="330" width="88"  height="58"  rx="14" fill="#bfdbfe"/>
          <circle cx="418" cy="349" r="7" fill="#60a5fa"/><circle cx="418" cy="349" r="4" fill="#93c5fd"/>
          <circle cx="440" cy="349" r="7" fill="#34d399"/><circle cx="440" cy="349" r="4" fill="#6ee7b7"/>
          <circle cx="462" cy="349" r="7" fill="#f472b6"/><circle cx="462" cy="349" r="4" fill="#f9a8d4"/>
          <rect x="405" y="367" width="70" height="8" rx="4" fill="#93c5fd"/>
          <rect x="325" y="316" width="38" height="90" rx="19" fill="#bee3f8" stroke="#bfdbfe" strokeWidth="1"/>
          <ellipse cx="345" cy="408" rx="18" ry="14" fill="#93c5fd"/>
          <g className="wave">
            <rect x="470" y="150" width="38" height="90" rx="19" fill="#bee3f8" stroke="#bfdbfe" strokeWidth="1" transform="rotate(60 405 326)"/>
            <ellipse cx="490" cy="150" rx="18" ry="14" fill="#93c5fd" transform="rotate(60 405 326)"/>
          </g>
          <rect x="340" y="160" width="200" height="152" rx="52" fill="#dbeafe"/>
          <rect x="340" y="160" width="200" height="152" rx="52" fill="none" stroke="#bfdbfe" strokeWidth="2"/>
          <rect x="322" y="210" width="30" height="50" rx="20" fill="#93c5fd" stroke="#bfdbfe" strokeWidth="1"/>
          <rect x="527" y="210" width="30" height="50" rx="20" fill="#93c5fd" stroke="#bfdbfe" strokeWidth="1"/>
          <rect x="372" y="188" width="136" height="88" rx="24" fill="#0f172a"/>
          <rect x="372" y="188" width="136" height="88" rx="24" fill="none" stroke="#1e40af" strokeWidth="1.5"/>
          <text x="390" y="225" fontFamily="monospace" fontSize="14" fill="#4ade80" fontWeight="bold">{`> Welcome`}</text>
          <rect x="390" y="235" width="8" height="14" rx="1" fill="#4ade80" className="cursor"/>
          <text x="390" y="262" fontFamily="monospace" fontSize="10" fill="#22d3ee" opacity="0.8">waiting_payment...</text>
          <line x1="394" y1="164" x2="376" y2="118" stroke="#93c5fd" strokeWidth="3" strokeLinecap="round"/>
          <circle cx="374" cy="110" r="12" fill="#d1fae5" stroke="#6ee7b7" strokeWidth="2"/>
          <circle cx="374" cy="110" r="4" fill="#10b981" className="dot-g"/>
          <line x1="486" y1="164" x2="504" y2="118" stroke="#93c5fd" strokeWidth="3" strokeLinecap="round"/>
          <circle cx="506" cy="110" r="12" fill="#fef9c3" stroke="#fde047" strokeWidth="2"/>
          <circle cx="506" cy="110" r="4"  fill="#eab308" className="dot-y"/>
        </g>
      </svg>
    </div>
  );
});

// ── Zod Schemas ──────────────────────────────────────────────────────────────
const loginSchema = z.object({
  email: z
    .string()
    .email("Format email tidak valid")
    .max(100, "Email terlalu panjang")
    .trim(),
  password: z
    .string()
    .min(6, "Password minimal 6 karakter")
    .max(100, "Password terlalu panjang"),
});

const forgotSchema = z.object({
  email: z
    .string()
    .email("Format email tidak valid")
    .max(100, "Email terlalu panjang")
    .trim(),
});

// ── Mode tampilan ────────────────────────────────────────────────────────────
type Mode = "login" | "forgot" | "forgot-sent";

export default function AdminLoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");

  // Login state
  const [email, setEmail]               = useState("");
  const [password, setPassword]         = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading]       = useState(false);
  const [errorMsg, setErrorMsg]         = useState("");
  const [fieldErrors, setFieldErrors]   = useState<{ email?: string; password?: string }>({});

  // Forgot password state
  const [forgotEmail, setForgotEmail]         = useState("");
  const [forgotLoading, setForgotLoading]     = useState(false);
  const [forgotError, setForgotError]         = useState("");
  const [forgotFieldError, setForgotFieldError] = useState("");

  // ── Handle Login ────────────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setFieldErrors({});

    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      const errs = result.error.flatten().fieldErrors;
      setFieldErrors({ email: errs.email?.[0], password: errs.password?.[0] });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email:    result.data.email,
        password: result.data.password,
      });

      if (error || !data.user) {
        setErrorMsg("Email atau password salah!");
        return;
      }

      // Catat session ke admin_sessions
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await supabase.from("admin_sessions").insert({
          user_id:     data.user.id,
          email:       data.user.email,
          token:       session.access_token,
          user_agent:  navigator.userAgent,
          last_active: new Date().toISOString(),
        });
      }

      // Notifikasi login
      const loginTime = new Date().toLocaleString("id-ID", {
        day: "2-digit", month: "long", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      });
      await supabase.from("log_notifikasi").insert([{
        pesan: `Admin "${result.data.email}" berhasil login pada ${loginTime}.`,
        read:  false,
      }]);

      router.replace("/admin/dashboard");
      router.refresh();

    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Terjadi kesalahan koneksi.");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Handle Forgot Password ───────────────────────────────────────────────
  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError("");
    setForgotFieldError("");

    const result = forgotSchema.safeParse({ email: forgotEmail });
    if (!result.success) {
      setForgotFieldError(result.error.flatten().fieldErrors.email?.[0] ?? "");
      return;
    }

    setForgotLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        result.data.email,
        { redirectTo: `${window.location.origin}/admin/reset-password` }
      );

      if (error) throw error;

      setMode("forgot-sent");
    } catch (err) {
      setForgotError(err instanceof Error ? err.message : "Gagal mengirim email reset.");
    } finally {
      setForgotLoading(false);
    }
  };

  const inputCls =
    "w-full h-12 border border-gray-300 rounded-xl px-4 pl-11 bg-gray-50 text-gray-900 placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-[#2B4C7E] focus:border-transparent transition-all";

  // ── RENDER ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4">

      {/* Background animasi */}
      <div className="absolute inset-0 z-0 bg-gradient-to-br from-[#1a2a4a] via-[#2B4C7E] to-[#487ADB]">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: `radial-gradient(circle at 20px 20px, rgba(255,255,255,0.15) 1px, transparent 1px)`, backgroundSize: "40px 40px" }} />
        <div className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full bg-yellow-400/20 blur-3xl animate-float-slow" style={{ animationDuration: "8s" }} />
        <div className="absolute -bottom-40 -left-40 w-[600px] h-[600px] rounded-full bg-indigo-300/15 blur-3xl animate-float-reverse" style={{ animationDuration: "10s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-purple-300/10 blur-3xl animate-pulse-slow" style={{ animationDuration: "6s" }} />
        <div className="absolute top-20 left-10 w-12 h-12 rounded-full bg-green-300/20 blur-xl animate-float-slow" style={{ animationDelay: "0s", animationDuration: "7s" }} />
        <div className="absolute bottom-20 right-20 w-16 h-16 rounded-full bg-teal-300/20 blur-xl animate-float-reverse" style={{ animationDelay: "1s", animationDuration: "9s" }} />
        <div className="absolute top-1/3 right-10 w-8 h-8 rounded-full bg-red-300/20 blur-lg animate-float-slow" style={{ animationDelay: "2s", animationDuration: "5s" }} />
        <div className="absolute bottom-1/4 left-1/4 w-10 h-10 rounded-full bg-yellow-300/10 blur-xl animate-float-reverse" style={{ animationDelay: "0.5s", animationDuration: "6s" }} />
      </div>

      {/* Card */}
      <div className="relative z-10 w-full max-w-4xl min-h-[500px] flex flex-row bg-white rounded-2xl shadow-2xl overflow-hidden">

        {/* Left Panel */}
        <div className="hidden md:flex w-[35%] relative overflow-hidden bg-gradient-to-br from-[#487ADB] to-[#2B4C7E]">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: `radial-gradient(circle at 20px 20px, rgba(255,255,255,0.2) 1px, transparent 1px)`, backgroundSize: "40px 40px" }} />
          <div className="absolute -top-20 -left-20 w-72 h-72 rounded-full bg-white/10 blur-3xl animate-float-slow" style={{ animationDuration: "10s" }} />
          <div className="absolute -bottom-24 -right-16 w-80 h-80 rounded-full bg-blue-300/20 blur-3xl animate-float-reverse" style={{ animationDuration: "12s" }} />
          <div className="absolute inset-0 flex items-center justify-center z-10 transform scale-[2] lg:scale-[2.5] xl:scale-[3] -translate-x-16 md:-translate-x-18 lg:-translate-x-26 -translate-y-10">
            <RobotMascot />
          </div>
        </div>

        {/* Right Panel */}
        <div className="w-full md:w-[65%] p-10 lg:p-14 bg-white flex flex-col justify-center">

          {/* ══ MODE: LOGIN ══ */}
          {mode === "login" && (
            <> 
              <Link href="/" className="flex items-center gap-1 text-sm text-slate-400 hover:text-[#2B4C7E] transition-colors mb-8 w-fit">
                <HiArrowLeft className="text-base" /> Kembali ke beranda
              </Link>
    
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-[#2B4C7E]">Selamat Datang!</h1>
              </div>

              {errorMsg && (
                <div className="mb-5 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-medium">
                  {errorMsg}
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-3">
                {/* Email */}
                <div className="relative">
                  <HiUser className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 text-base pointer-events-none" />
                  <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setFieldErrors((p) => ({ ...p, email: undefined })); setErrorMsg(""); }}
                    required
                    autoComplete="email"
                    className={`${inputCls} ${fieldErrors.email ? "border-red-400 focus:ring-red-300" : ""}`}
                  />
                  {fieldErrors.email && <p className="mt-1 text-xs text-red-500">{fieldErrors.email}</p>}
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
                    {showPassword ? <HiEyeSlash className="text-base" /> : <HiEye className="text-base" />}
                  </button>
                  {fieldErrors.password && <p className="mt-1 text-xs text-red-500">{fieldErrors.password}</p>}
                </div>

                {/* Lupa Password */}
                <div className="text-right">
                  <button
                    type="button"
                    onClick={() => { setMode("forgot"); setForgotEmail(email); setForgotError(""); setForgotFieldError(""); }}
                    className="text-xs text-[#4A81D4] hover:text-[#2B4C7E] transition-colors font-medium"
                  >
                    Lupa password?
                  </button>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 bg-[#2B4C7E] hover:bg-[#1a3561] text-white font-bold text-sm rounded-xl shadow-md hover:shadow-lg transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed tracking-widest"
                >
                  {isLoading ? "Memproses..." : "LOGIN"}
                </button>
              </form>
            </>
          )}

          {/* ══ MODE: FORGOT PASSWORD ══ */}
          {mode === "forgot" && (
            <>
              <button
                onClick={() => setMode("login")}
                className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-[#2B4C7E] transition-colors mb-8 w-fit"
              >
                <HiArrowLeft className="text-base" />
                Kembali ke login
              </button>

              <div className="mb-8">
                <h1 className="text-3xl font-bold text-[#2B4C7E]">Lupa Password?</h1>
                <p className="text-sm text-gray-400 mt-2">
                  Masukkan email Anda dan kami akan mengirimkan link untuk reset password.
                </p>
              </div>

              {forgotError && (
                <div className="mb-5 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-medium">
                  {forgotError}
                </div>
              )}

              <form onSubmit={handleForgot} className="space-y-4">
                <div className="relative">
                  <HiUser className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 text-base pointer-events-none" />
                  <input
                    type="email"
                    placeholder="Email"
                    value={forgotEmail}
                    onChange={(e) => { setForgotEmail(e.target.value); setForgotFieldError(""); }}
                    required
                    autoComplete="email"
                    className={`${inputCls} ${forgotFieldError ? "border-red-400 focus:ring-red-300" : ""}`}
                  />
                  {forgotFieldError && <p className="mt-1 text-xs text-red-500">{forgotFieldError}</p>}
                </div>

                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="w-full h-12 bg-[#2B4C7E] hover:bg-[#1a3561] text-white font-bold text-sm rounded-xl shadow-md hover:shadow-lg transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed tracking-widest"
                >
                  {forgotLoading ? "Mengirim..." : "KIRIM LINK RESET"}
                </button>
              </form>
            </>
          )}

          {/* ══ MODE: EMAIL TERKIRIM ══ */}
          {mode === "forgot-sent" && (
            <div className="flex flex-col items-center text-center gap-5">
              {/* Icon sukses */}
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
                <svg className="w-8 h-8 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-[#2B4C7E]">Email Terkirim!</h2>
                <p className="text-sm text-gray-400 mt-2 max-w-xs">
                  Link reset password telah dikirim ke <span className="font-semibold text-slate-600">{forgotEmail}</span>.
                  Periksa inbox atau folder spam Anda.
                </p>
              </div>

              <button
                onClick={() => { setMode("login"); setForgotEmail(""); }}
                className="mt-2 text-sm text-[#4A81D4] hover:text-[#2B4C7E] font-medium transition-colors"
              >
                ← Kembali ke login
              </button>
            </div>
          )}

        </div>
      </div>

      {/* Keyframes */}
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
        .animate-float-slow { animation: float-slow ease-in-out infinite; }
        .animate-float-reverse { animation: float-reverse ease-in-out infinite; }
        .animate-pulse-slow { animation: pulse-slow ease-in-out infinite; }
      `}</style>
    </div>
  );
}
