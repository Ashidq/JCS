import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isAdminPath       = pathname.startsWith("/admin");
  const isLoginPage       = pathname === "/admin/login";
  const isMaintenancePage = pathname === "/maintenance";

  // Buat response awal
  let res = NextResponse.next({ request });

  // ── Cek Session Supabase Auth via @supabase/ssr ────────────────────────────
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value}) => {
            request.cookies.set(name, value);
          });
          res = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            res.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {data:{user}}=await supabase.auth.getUser();

  const isAuthenticated=!!user;

  // ── Proteksi halaman /admin ────────────────────────────────────────────────
  // Belum login → redirect ke /admin/login
  if (isAdminPath && !isLoginPage && !isAuthenticated) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  // Sudah login + akses /admin/login → redirect ke dashboard
  if (isLoginPage && isAuthenticated) {
    return NextResponse.redirect(new URL("/admin/dashboard", request.url));
  }

  // Bukan rute admin dan bukan /maintenance → lewat langsung
  if (!isAdminPath && ! isMaintenancePage) {
    return res;
  }

  // ── Cek status maintenance dari Supabase ──────────────────────────────────
  let isMaintenance = false;

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const maintenanceRes = await fetch(
      `${supabaseUrl}/rest/v1/global_settings?id=eq.1&select=is_maintenance`,
      {
        headers: {
          apikey:         supabaseKey,
          Authorization:  `Bearer ${supabaseKey}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      }
    );

    if (maintenanceRes.ok) {
      const data: { is_maintenance: boolean }[] = await maintenanceRes.json();
      isMaintenance = data?.[0]?.is_maintenance ?? false;
    }
  } catch {
    return res;
  }

  // ── Logika routing maintenance ─────────────────────────────────────────────
  if (isMaintenance && isAdminPath) {
    return NextResponse.redirect(new URL("/maintenance", request.url));
  }

  if (!isMaintenance && isMaintenancePage) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  return res;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.svg$|.*\\.webp$|.*\\.ico$|.*\\.js$|.*\\.css$).*)",
  ],
};
