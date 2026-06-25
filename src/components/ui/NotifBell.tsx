"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { HiBell, HiTrash } from "react-icons/hi2";
import { supabase } from "../../app/scan/supabase-logic";

interface Notif {
  id_log: number;
  pesan:  string;
  waktu:  string;
  read:   boolean;
}

export default function NotifBell() {
  const [isOpen,        setIsOpen]        = useState(false);
  const [notifications, setNotifications] = useState<Notif[]>([]);
  const [unreadCount,   setUnreadCount]   = useState(0);
  const [deletingId,    setDeletingId]    = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  // ── Fetch notifikasi ──
  const fetchNotif = useCallback(async () => {
    const { data } = await supabase
      .from("log_notifikasi")
      .select("*")
      .order("waktu", { ascending: false })
      .limit(20);

    const rows = (data as Notif[]) ?? [];
    setNotifications(rows);
    setUnreadCount(rows.filter((n) => !n.read).length);
  }, []);

  useEffect(() => { fetchNotif(); }, [fetchNotif]);

  // Realtime: dengarkan INSERT baru
  useEffect(() => {
    const channel = supabase
      .channel("log_notifikasi_changes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "log_notifikasi" },
        () => fetchNotif()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchNotif]);

  // ── Buka dropdown + tandai semua sebagai dibaca ──
  const handleOpen = useCallback(async () => {
    setIsOpen((v) => {
      const next = !v;

      if (next && unreadCount > 0) {
        const unreadIds = notifications
          .filter((n) => !n.read)
          .map((n) => n.id_log);

        if (unreadIds.length > 0) {
          supabase
            .from("log_notifikasi")
            .update({ read: true })
            .in("id_log", unreadIds)
            .then(() => {
              setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
              setUnreadCount(0);
            });
        }
      }

      return next;
    });
  }, [unreadCount, notifications]);

  // ── Hapus satu notifikasi ──
  const handleDelete = useCallback(async (id: number) => {
    setDeletingId(id);
    try {
      await supabase.from("log_notifikasi").delete().eq("id_log", id);
      setNotifications((prev) => {
        const updated = prev.filter((n) => n.id_log !== id);
        setUnreadCount(updated.filter((n) => !n.read).length);
        return updated;
      });
    } finally {
      setDeletingId(null);
    }
  }, []);

  // ── Hapus semua notifikasi ──
  const handleDeleteAll = useCallback(async () => {
    if (!window.confirm("Hapus semua notifikasi?")) return;
    const ids = notifications.map((n) => n.id_log);
    if (ids.length === 0) return;
    await supabase.from("log_notifikasi").delete().in("id_log", ids);
    setNotifications([]);
    setUnreadCount(0);
  }, [notifications]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const fmtWaktu = (s: string) =>
    new Date(s).toLocaleString("id-ID", {
      day:    "2-digit",
      month:  "short",
      hour:   "2-digit",
      minute: "2-digit",
    });

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={handleOpen}
        className="w-10 h-10 bg-white rounded-full border border-slate-100 shadow-sm flex items-center justify-center hover:bg-slate-50 transition-colors"
        aria-label="Notifikasi"
      >
        <HiBell className="text-[#4A81D4] text-xl" />
      </button>

      {/* Badge unread */}
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 border-2 border-white">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-12 w-80 bg-white rounded-xl shadow-lg border border-slate-100 z-50 overflow-hidden">

          {/* Header */}
          <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
            <p className="font-semibold text-slate-800 text-sm">Notifikasi</p>
            {notifications.length > 0 && (
              <button
                onClick={handleDeleteAll}
                className="flex items-center gap-1 text-[10px] text-red-400 hover:text-red-600 font-medium transition-colors"
              >
                <HiTrash className="text-base" /> Hapus semua
              </button>
            )}
          </div>

          {/* Content */}
          {notifications.length === 0 ? (
            <div className="p-6 text-center text-gray-400 text-sm">
              Belum ada notifikasi.
            </div>
          ) : (
            <ul className="max-h-72 overflow-y-auto">
              {notifications.map((n) => (
                <li
                  key={n.id_log}
                  className={`px-4 py-3 border-b border-slate-50 last:border-0 transition-colors group ${
                    !n.read ? "bg-red-50 hover:bg-red-100" : "hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {/* Dot merah untuk yang belum dibaca */}
                    {!n.read && (
                      <span className="mt-1.5 w-2 h-2 rounded-full bg-red-500 shrink-0" />
                    )}
                    <div className={`flex-1 ${!n.read ? "" : "pl-4"}`}>
                      <p className="text-slate-700 text-sm leading-snug">{n.pesan}</p>
                      <p className="text-slate-400 text-xs mt-1">{fmtWaktu(n.waktu)}</p>
                    </div>

                    {/* Tombol hapus — muncul saat hover */}
                    <button
                      onClick={() => handleDelete(n.id_log)}
                      disabled={deletingId === n.id_log}
                      className="opacity-0 group-hover:opacity-100 shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all disabled:opacity-30"
                      aria-label="Hapus notifikasi"
                    >
                      <HiTrash className="text-sm" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}