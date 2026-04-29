"use client";

/**
 * Fungsi untuk mengirim frame kamera ke backend Python (FastAPI).
 * Dilengkapi dengan error handling yang silent untuk mencegah polusi log konsol
 * saat backend sedang inisialisasi atau re-loading.
 */
export const sendFrameToAPI = async (blob: Blob) => {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  
  const formData = new FormData();
  // Kita beri nama file frame.jpg agar FastAPI membacanya sebagai UploadFile
  formData.append("file", blob, "frame.jpg");

  try {
    const res = await fetch(`${API_URL}/detect-payment-screen`, {
      method: "POST",
      body: formData,
      // Menambahkan signal abort jika diperlukan (opsional) atau timeout
      // untuk mencegah request menggantung jika server sibuk
    });

    if (!res.ok) {
      // Jika server memberikan respon selain 2xx
      console.warn(`⚠️ API Response Error: ${res.status}`);
      return null;
    }

    return await res.json();
  } catch (error) {
    /**
     * Mengatasi ERR_CONNECTION_REFUSED atau network error lainnya.
     * Kita return null alih-alih melempar Error agar loop di useCameraCV.ts 
     * tetap berjalan dan mencoba lagi di frame berikutnya tanpa memutus alur.
     */
    // console.debug("Backend standby / reconnecting..."); 
    return null;
  }
};