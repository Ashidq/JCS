import { createBrowserClient } from "@supabase/ssr";
import { validateTransactionDate } from "./ocr-logic";

// ============================================================
// INISIALISASI SUPABASE CLIENT
// ============================================================
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ============================================================
// MODULE 1: SCAN MANUAL (Dari Browser)
// SKPL-F-001: Upload bukti ke Storage
// SKPL-F-005: Simpan transaksi ke Database
// ============================================================

/**
 * Mengunggah blob gambar dari kamera browser ke Supabase Storage,
 * lalu menyimpan data transaksi dan bukti pembayaran ke database.
 *
 * Status transaksi diatur berdasarkan hasil OCR:
 * - isSuccess=true  → status_validasi="Valid",   status bukti="valid"
 * - isSuccess=false → status_validasi="Pending",  status bukti="invalid"
 */
export const uploadAndSaveTransaction = async (
  blob: Blob,
  amount?: number | null
) => {
  // Simpan langsung di root bucket tanpa folder 'public/'
  const fileName = `bukti_${Date.now()}.png`;

  // 1. Upload gambar ke Supabase Storage (bucket: bukti-transfer)
  const { data: storageData, error: storageError } = await supabase.storage
    .from("bukti-transfer")
    .upload(fileName, blob, { contentType: "image/png", upsert: false });

  if (storageError) {
    console.error("[Supabase Storage] Gagal upload:", storageError.message);
    throw storageError;
  }

  // 2. Simpan transaksi ke tabel 'transaksi'
  // Nominal default = 1 agar tidak melanggar constraint NOT NULL / positif
  const nominalValue = amount && amount > 0 ? amount : 1;
  const validasiStatus = amount && amount > 0 ? "Valid" : "Pending";

  const { data: transData, error: transError } = await supabase
    .from("transaksi")
    .insert([{
      nominal: nominalValue,
      metode_pembayaran: "QRIS",
      status_validasi: validasiStatus,
    }])
    .select()
    .single();

  if (transError) {
    console.error("[Supabase DB] Gagal insert transaksi:", transError.message);
    throw transError;
  }

  // 3. Simpan detail bukti ke tabel 'bukti_pembayaran'
  // status: "valid" / "invalid" → sesuai Check Constraint bukti_pembayaran_status_check
  const buktiStatus = amount && amount > 0 ? "valid" : "invalid";

  const { error: detailError } = await supabase
    .from("bukti_pembayaran")
    .insert([{
      id_transaksi: transData.id_transaksi,
      file_gambar: storageData.path,
      status: buktiStatus,
      waktu_capture: new Date().toISOString(),
    }]);

  if (detailError) {
    console.error("[Supabase DB] Gagal insert bukti_pembayaran:", detailError.message);
    throw detailError;
  }
  return transData;
};

/**
 * Menghapus file gambar dari Supabase Storage jika OCR gagal mendeteksi nominal
 */
export const deleteBuktiFile = async (idBukti: number | string) => {
  try {
    const { data: buktiData } = await supabase
      .from("bukti_pembayaran")
      .select("file_gambar")
      .eq("id_bukti", idBukti)
      .single();

    if (buktiData && buktiData.file_gambar) {
      const { error } = await supabase.storage
        .from("bukti-transfer")
        .remove([buktiData.file_gambar]);
        
      if (error) {
        console.error("⚠️ [Supabase] Gagal menghapus file:", error.message);
      } else {
      }
    }
  } catch (err) {
    console.error("⚠️ [Supabase] Error saat menghapus file:", err);
  }
};

// ============================================================
// MODULE 2: SUPABASE STORAGE HELPER
// ============================================================

/**
 * Mengonversi path relatif (misal: "bukti_123.png")
 * menjadi URL publik penuh untuk diunduh oleh OCR engine.
 */
export const getPublicImageUrl = (filePath: string): string => {
  // Bersihkan dari potensi folder 'public/' (jika ada data lama) dan slash ganda
  const cleanPath = filePath.replace(/^public\//, '').replace(/^\/+/, '');
  
  const { data } = supabase.storage
    .from("bukti-transfer")
    .getPublicUrl(cleanPath);

  return data.publicUrl;
};

// ============================================================
// MODULE 3: OCR RESULT HANDLER (Untuk Auto-Scan / Realtime)
// Dipanggil setelah Next.js selesai memproses gambar dari Python
// ============================================================

/**
 * Menyimpan hasil OCR ke tabel `hasil_ocr`.
 * Selalu dipanggil terlepas dari apakah OCR berhasil atau gagal.
 *
 * @param idBukti  - FK ke tabel bukti_pembayaran
 * @param teksOcr  - Teks mentah hasil ekstraksi OCR
 * @param nominal  - Nominal yang berhasil diekstrak, null jika gagal
 *
 * Requirements: 4.3, 4.4
 */
export const saveOCRResult = async (
  idBukti: number | string,
  teksOcr: string,
  nominal: number | null,
  merchantName: string | null
) => {
  const { data, error } = await supabase
    .from("hasil_ocr")
    .insert([{
      id_bukti: idBukti,
      teks_ocr: teksOcr,
      nominal_terbaca: nominal,
      merchant_name: merchantName,
    }])
    .select()
    .single();

  if (error) {
    console.error("[Supabase] Gagal insert hasil_ocr:", error.message);
    throw error;
  }
  return data;
};

/**
 * Memperbarui field `status` pada tabel `bukti_pembayaran`.
 * Status 'valid' jika nominal terdeteksi, 'invalid' jika tidak.
 *
 * @param idBukti - FK ke tabel bukti_pembayaran
 * @param status  - 'valid' atau 'invalid'
 *
 * Requirements: 3.2, 4.5
 */
export const updateBuktiStatus = async (
  idBukti: number | string,
  status: "valid" | "invalid" | "pending"
) => {
  const { data, error } = await supabase
    .from("bukti_pembayaran")
    .update({ status })
    .eq("id_bukti", idBukti)
    .select();

  if (error) {
    console.error("[Supabase] Gagal update bukti_pembayaran status:", error.message);
    throw error;
  }
  return data;
};

/**
 * Memperbarui tabel transaksi dan bukti_pembayaran sekaligus
 * dipanggil ketika OCR menemukan nominal.
 */
export const updateTransactionFromOCR = async (
  idBukti: number | string,
  amount: number,
  merchantName: string | null,
  transactionDate?: Date | null
) => {
  // 1. Dapatkan id_transaksi dari bukti
  const { data: buktiData, error: buktiErr } = await supabase
    .from("bukti_pembayaran")
    .select("id_transaksi")
    .eq("id_bukti", idBukti)
    .single();

  if (buktiErr || !buktiData) {
    console.error("[Supabase] Gagal fetch id_transaksi:", buktiErr?.message);
    return;
  }

  const isStrictMerchantValid = merchantName === "HMIT STORE ITS";

  // Validasi selisih waktu maksimal 5 menit
  const timeValidation = validateTransactionDate(transactionDate ?? null, 5);
  const isTimeValid = timeValidation.isValid;

  // Status Valid hanya jika merchant benar DAN waktu dalam 5 menit
  let validasiStatus: "Valid" | "Pending" | "Invalid";
  if (!isStrictMerchantValid) {
    validasiStatus = "Pending";
  } else if (!isTimeValid) {
    validasiStatus = "Invalid";
  } else {
    validasiStatus = "Valid";
  }

  const buktiStatus = validasiStatus === "Valid" ? "valid" : "invalid";

  let idTransaksi = buktiData.id_transaksi;

  if (!idTransaksi) {
    // 2A. Jika id_transaksi masih null (Auto-Capture), BUAT transaksi baru
    const { data: newTrans, error: createErr } = await supabase
      .from("transaksi")
      .insert([{
        nominal: amount,
        metode_pembayaran: "QRIS",
        status_validasi: validasiStatus,
      }])
      .select()
      .single();

    if (createErr) {
      console.error("[Supabase] Gagal create transaksi baru:", createErr.message);
      return;
    }

    idTransaksi = newTrans.id_transaksi;

    // Tautkan id_transaksi ke tabel bukti_pembayaran
    await supabase
      .from("bukti_pembayaran")
      .update({ id_transaksi: idTransaksi })
      .eq("id_bukti", idBukti);

  } else {
    // 2B. Jika id_transaksi sudah ada, UPDATE nominal dan status
    const { error: transErr } = await supabase
      .from("transaksi")
      .update({
        nominal: amount,
        status_validasi: validasiStatus
      })
      .eq("id_transaksi", idTransaksi);

    if (transErr) {
      console.error("[Supabase] Gagal update transaksi nominal:", transErr.message);
    } else {
    }
  }

  // 3. Update status bukti_pembayaran
  await updateBuktiStatus(idBukti, buktiStatus);

  // 4. Kirim notifikasi ke log_notifikasi jika transaksi Invalid
  if (validasiStatus === "Invalid") {
    const alasan = timeValidation && !timeValidation.isValid
      ? timeValidation.reason
      : "Transaksi tidak memenuhi syarat validasi.";
    await supabase.from("log_notifikasi").insert([{
      pesan:    `Transaksi Invalid — ${alasan}`,
      read:  false,
    }]);
  }

  return { validasiStatus, timeValidation };
};

