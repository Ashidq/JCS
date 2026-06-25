"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import AdminSidebar from "../../components/admin/AdminSidebar";
import { supabase } from "../scan/supabase-logic";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const [authorized, setAuthorized] = useState(false);

  const isLoginPage = pathname === "/admin/login";

  useEffect(() => {
    if (isLoginPage) {
      setAuthorized(true);
      return;
    }

    // Cek session Supabase Auth
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push("/admin/login");
      } else {
        setAuthorized(true);
      }
    });

    // Dengarkan perubahan session (misal: expired, logout dari tab lain)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isLoginPage && !session) {
        router.push("/admin/login");
      }
    });

    return () => subscription.unsubscribe();
  }, [isLoginPage, router, pathname]);

  if (!authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-400 text-sm">Memeriksa otorisasi...</p>
      </div>
    );
  }

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900 font-sans">
      <AdminSidebar />
      <div className="ml-64 flex-1 overflow-y-auto text-slate-800 dark:text-slate-100">
        {children}
      </div>
    </div>
  );
}
