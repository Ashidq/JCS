"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "../../app/scan/supabase-logic";
import { HiUser, HiPencilSquare, HiChevronDown, HiXMark } from "react-icons/hi2";
import NotifBell from "../ui/NotifBell";

// ─── Edit Profil Modal ─────────────────────────────────────────────────────

function EditProfilModal({
  currentEmail,
  currentDisplayName,
  onClose,
  onSaved,
}: {
  currentEmail: string;
  currentDisplayName: string;
  onClose: () => void;
  onSaved: (newName: string) => void;
}) {
  const [displayName, setDisplayName] = useState(currentDisplayName);
  const [password, setPassword]       = useState("");
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState("");
  const [success, setSuccess]         = useState("");

  const inputCls =
    "w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4A81D4]/30 focus:border-[#4A81D4] transition bg-white";

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!displayName.trim()) {
      setError("Nama tidak boleh kosong.");
      return;
    }

    setSaving(true);
    try {
      const updatePayload: { data?: { display_name: string }; password?: string } = {
        data: { display_name: displayName.trim() },
      };
      if (password) updatePayload.password = password;

      const { error: updateErr } = await supabase.auth.updateUser(updatePayload);
      if (updateErr) throw updateErr;

      setSuccess("Profil berhasil diperbarui.");
      onSaved(displayName.trim());
      setTimeout(() => onClose(), 1000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal memperbarui profil.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <p className="font-bold text-slate-800 text-lg">Edit Profil</p>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <HiXMark className="text-lg" />
          </button>
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-xs font-medium">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-600 text-xs font-medium">
            {success}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">

          {/* Email — read only */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={currentEmail}
              disabled
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-400 bg-slate-50 cursor-not-allowed"
            />
          </div>

          {/* Display Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              Nama Tampilan
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Nama yang ditampilkan"
              className={inputCls}
              required
            />
          </div>

          {/* Password Baru */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              Password Baru
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Kosongkan jika tidak ingin mengubah"
              className={inputCls}
            />
          </div>

          <div className="flex gap-3 mt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 py-2.5 rounded-lg border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 rounded-lg bg-[#4A81D4] hover:bg-[#3a6fc0] text-white text-sm font-semibold transition-colors disabled:opacity-60"
            >
              {saving ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── AdminHeader ───────────────────────────────────────────────────────────

interface AdminHeaderProps {
  title: string;
  subtitle?: string;
}

export default function AdminHeader({ title, subtitle }: AdminHeaderProps) {
  const [email, setEmail]               = useState("");
  const [displayName, setDisplayName]   = useState("Admin");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Ambil data user dari Supabase Auth
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      setEmail(user.email ?? "");
      const name = user.user_metadata?.display_name as string | undefined;
      setDisplayName(name || (user.email?.split("@")[0] ?? "Admin"));
    });

    // Update otomatis jika session berubah
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      if (!session?.user) return;
      const name = session.user.user_metadata?.display_name as string | undefined;
      setEmail(session.user.email ?? "");
      setDisplayName(name || (session.user.email?.split("@")[0] ?? "Admin"));
    });

    return () => subscription.unsubscribe();
  }, []);

  // Tutup dropdown saat klik di luar
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{title}</h1>
          {subtitle && (
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">{subtitle}</p>
          )}
        </div>

        <div className="flex items-center gap-4">
          <NotifBell />

          {/* Profile dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen((v) => !v)}
              className="flex items-center gap-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl px-2 py-1.5 transition-colors"
            >
              <div className="w-9 h-9 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center flex-shrink-0">
                <HiUser className="text-slate-500 dark:text-slate-300 text-lg" />
              </div>
              <div className="text-sm leading-tight text-left">
                <p className="font-semibold text-slate-800 dark:text-slate-100">{displayName}</p>
                <p className="text-slate-500 dark:text-slate-400 text-xs">{email || "Staff KWU"}</p>
              </div>
              <HiChevronDown
                className={`text-slate-400 dark:text-slate-500 text-sm transition-transform duration-200 ${
                  dropdownOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-lg py-1 z-50">
                <button
                  onClick={() => { setShowEditModal(true); setDropdownOpen(false); }}
                  className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  <HiPencilSquare className="text-base text-slate-400 dark:text-slate-500" />
                  Edit Profil
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Blue divider */}
      <div className="h-[3px] bg-[#487ADB] w-full shadow-sm rounded-none" />

      {showEditModal && (
        <EditProfilModal
          currentEmail={email}
          currentDisplayName={displayName}
          onClose={() => setShowEditModal(false)}
          onSaved={(newName) => setDisplayName(newName)}
        />
      )}
    </>
  );
}