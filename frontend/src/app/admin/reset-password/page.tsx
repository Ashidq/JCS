"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../scan/supabase-logic";
import { HiLockClosed, HiEye, HiEyeSlash } from "react-icons/hi2";
import { z } from "zod";

const resetSchema = z
  .object({
    password: z
      .string()
      .min(6, "Password minimal 6 karakter")
      .max(100, "Password terlalu panjang"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Konfirmasi password tidak cocok",
    path: ["confirmPassword"],
  });

export default function ResetPasswordPage() {
  const router = useRouter();

  const [password, setPassword]               = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword]       = useState(false);
  const [showConfirm, setShowConfirm]         = useState(false);
  const [isLoading, setIsLoading]             = useState(false);
  const [errorMsg, setErrorMsg]               = useState("");
  const [fieldErrors, setFieldErrors]         = useState<{ password?: string; confirmPassword?: string }>({});
  const [isSuccess, setIsSuccess]             = useState(false);
  const [isValidSession, setIsValidSession]   = useState(false);
  const [checking, setChecking]               = useState(true);

  // Cek apakah user punya session valid dari link reset
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsValidSession(!!session);
      setChecking(false);
    });

    // Supabase otomatis set session dari URL hash saat redirect
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsValidSession(!!session);
        setChecking(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setFieldErrors({});

    const result = resetSchema.safeParse({ password, confirmPassword });
    if (!result.success) {
      const errs = result.error.flatten().fieldErrors;
      setFieldErrors({
        password:        errs.password?.[0],
        confirmPassword: errs.confirmPassword?.[0],
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: result.data.password,
      });

      if (error) throw error;

      setIsSuccess(true);

      // Logout session reset, arahkan ke login setelah 3 detik
      setTimeout(async () => {
        await supabase.auth.signOut();
        router.replace("/admin/login");
      }, 3000);

    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Gagal mereset password.");
    } finally {
      setIsLoading(false);
    }
  };

  const inputCls = (err?: string) =>
    `w-full h-12 border rounded-xl px-4 pl-11 bg-gray-50 text-gray-900 placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:border-transparent transition-all ${
      err
        ? "border-red-400 focus:ring-red-300"
        : "border-gray-300 focus:ring-[#2B4C7E]"
    }`;

  // ── Loading cek session ──
  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1a2a4a] via-[#2B4C7E] to-[#487ADB]">
        <p className="text-white/60 text-sm">Memverifikasi link...</p>
      </div>
    );
  }

  // ── Link tidak valid / expired ──
  if (!isValidSession) {
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

        <div className="relative z-10 bg-white rounded-2xl shadow-2xl p-10 w-full max-w-md">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-5">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Link Tidak Valid</h2>
          <p className="text-sm text-slate-400 mb-6">
            Link reset password sudah kadaluarsa atau tidak valid. Silakan minta link baru.
          </p>
          <button
            onClick={() => router.replace("/admin/login")}
            className="w-full h-11 bg-[#2B4C7E] hover:bg-[#1a3561] text-white font-bold text-sm rounded-xl transition-all"
          >
            Kembali ke Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1a2a4a] via-[#2B4C7E] to-[#487ADB] p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-10 w-full max-w-md">

        {/* ── Sukses ── */}
        {isSuccess ? (
          <div className="flex flex-col items-center text-center gap-5">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
              <svg className="w-8 h-8 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-[#2B4C7E]">Password Berhasil Diubah!</h2>
              <p className="text-sm text-gray-400 mt-2">
                Anda akan diarahkan ke halaman login dalam beberapa detik...
              </p>
            </div>
          </div>

        ) : (

          /* ── Form Reset ── */
          <>
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-[#2B4C7E]">Reset Password</h1>
              <p className="text-sm text-gray-400 mt-1">Masukkan password baru Anda.</p>
            </div>

            {errorMsg && (
              <div className="mb-5 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-medium">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleReset} className="space-y-4">
              {/* Password Baru */}
              <div>
                <div className="relative">
                  <HiLockClosed className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 text-base pointer-events-none" />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Password baru"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setFieldErrors((p) => ({ ...p, password: undefined })); }}
                    required
                    className={`${inputCls(fieldErrors.password)} pr-11`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <HiEyeSlash className="text-base" /> : <HiEye className="text-base" />}
                  </button>
                </div>
                {fieldErrors.password && <p className="mt-1 text-xs text-red-500">{fieldErrors.password}</p>}
              </div>

              {/* Konfirmasi Password */}
              <div>
                <div className="relative">
                  <HiLockClosed className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 text-base pointer-events-none" />
                  <input
                    type={showConfirm ? "text" : "password"}
                    placeholder="Konfirmasi password baru"
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); setFieldErrors((p) => ({ ...p, confirmPassword: undefined })); }}
                    required
                    className={`${inputCls(fieldErrors.confirmPassword)} pr-11`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    tabIndex={-1}
                  >
                    {showConfirm ? <HiEyeSlash className="text-base" /> : <HiEye className="text-base" />}
                  </button>
                </div>
                {fieldErrors.confirmPassword && <p className="mt-1 text-xs text-red-500">{fieldErrors.confirmPassword}</p>}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 bg-[#2B4C7E] hover:bg-[#1a3561] text-white font-bold text-sm rounded-xl shadow-md hover:shadow-lg transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed tracking-widest mt-2"
              >
                {isLoading ? "Menyimpan..." : "SIMPAN PASSWORD BARU"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}