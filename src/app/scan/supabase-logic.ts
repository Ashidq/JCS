import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * Fungsi untuk mengunggah bukti gambar ke Storage dan menyimpan metadata ke Database.
 * @param blob - Data gambar hasil capture kamera
 * @param amount - Nilai nominal hasil ekstraksi OCR (Opsional)
 */
export const uploadAndSaveTransaction = async (
  blob: Blob, 
  amount?: number | null
) => {
  // Prefix 'public/' untuk mematuhi kebijakan RLS Storage
  const fileName = `public/bukti_${Date.now()}.png`;

  // 1. Upload Gambar ke Supabase Storage (SKPL-F-001)
  const { data: storageData, error: storageError } = await supabase.storage
    .from("bukti-transfer")
    .upload(fileName, blob);

  if (storageError) throw storageError;

  // 2. Simpan Transaksi ke Tabel 'transaksi' (SKPL-F-005)
  /** * Logika Nominal:
   * Menggunakan hasil OCR (amount) jika tersedia. 
   * Jika OCR gagal (null/0), gunakan fallback 1 karena database menolak angka 0.
   */
  const nominalValue = amount && amount > 0 ? amount : 1;

  const { data: transData, error: transError } = await supabase
    .from("transaksi")
    .insert([{ 
      nominal: nominalValue, 
      metode_pembayaran: "QRIS", 
      status_validasi: "Pending" 
    }])
    .select()
    .single();

  if (transError) throw transError;

  // 3. Simpan Detail Bukti ke Tabel 'bukti_pembayaran' (Tabel 7)
  const { error: detailError } = await supabase
    .from("bukti_pembayaran")
    .insert([{
      id_transaksi: transData.id_transaksi, // Foreign Key dari transData
      file_gambar: storageData.path,        // Path file yang baru diupload
      status: "valid",                      // Status awal
      waktu_capture: new Date().toISOString()
    }]);

  if (detailError) throw detailError;

  return transData;
};