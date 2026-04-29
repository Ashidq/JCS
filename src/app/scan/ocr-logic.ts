import { createWorker } from "tesseract.js";

export interface OCRResult {
  rawText: string;
  amount: number | null;
  merchantName: string | null;
  isSuccess: boolean;
  error?: string;
}

export const performOCR = async (imageBlob: Blob): Promise<OCRResult> => {
  // 1. Inisialisasi Worker
  const worker = await createWorker("ind+eng");

  try {
    const imageUrl = URL.createObjectURL(imageBlob);

    /**
     * 🔥 PENAMBAHAN PARAMETER WHITELIST
     * Memaksa Tesseract hanya mengenali angka dan kata kunci keuangan.
     * Ini mengurangi "noise" karakter aneh secara signifikan.
     */
    await worker.setParameters({
      tessedit_char_whitelist: "0123456789RP.,TOTALBAYARNOMINALAMOUNTJUMLAHBERHASILSUCCESSCOMPLETEDHMITSTOREITSSURABAYA ",
    });

    // 2. Jalankan Recognisi
    const { data: { text } } = await worker.recognize(imageUrl);
    
    URL.revokeObjectURL(imageUrl);
    await worker.terminate();

    console.log("📝 [OCR RAW]:", text);

    // Validasi konten minimal
    if (!text || text.trim().length < 5) {
      return { 
        rawText: text || "", 
        amount: null, 
        merchantName: null, 
        isSuccess: false, 
        error: "Gagal mengekstrak teks. Pastikan gambar fokus dan tidak terpotong." 
      };
    }

    // 3. Post-processing
    const detectedAmount = extractNominal(text);
    const merchant = extractMerchant(text);

    if (detectedAmount === null) {
      return { 
        rawText: text, 
        amount: null, 
        merchantName: merchant, 
        isSuccess: false, 
        error: "Nominal tidak ditemukan dalam teks." 
      };
    }

    return {
      rawText: text,
      amount: detectedAmount,
      merchantName: merchant,
      isSuccess: true,
    };
  } catch (error) {
    console.error("OCR Runtime Error:", error);
    if (worker) await worker.terminate();
    return { 
      rawText: "", 
      amount: null, 
      merchantName: null, 
      isSuccess: false, 
      error: "Mesin pemindai gagal memproses gambar." 
    };
  }
};

/**
 * LOGIKA EKSTRAKSI NOMINAL
 */
const extractNominal = (text: string): number | null => {
  // Normalisasi karakter yang sering salah baca (O -> 0, I -> 1)
  const normalizedText = text.toUpperCase()
    .replace(/[O]/g, "0")
    .replace(/[IL|]/g, "1")
    .replace(/\s+/g, " ");

  const patterns = [
    // Pola 1: Keyword + Angka
    /(?:RP|TOTAL|NOMINAL|AMOUNT|BAYAR|JUMLAH|TRANSFER)\s?([\d.,]{3,10})/i,
    
    // Pola 2: Angka + Status
    /([\d.,]{3,10})\s?(?:BERHASIL|SUCCESS|COMPLETED|SELESAI)/i,
    
    // Pola 3: Angka ribuan murni (Contoh: 15.000 atau 5,000)
    /(?:^|\s)([\d]{1,3}[.,][\d]{3})(?:\s|$)/
  ];

  for (const regex of patterns) {
    const match = normalizedText.match(regex);
    if (match && match[1]) {
      // Bersihkan pemisah ribuan
      let numericString = match[1].replace(/[.,](?=\d{3})/g, ""); 
      numericString = numericString.replace(/[.,]/g, ""); 
      
      const amount = parseInt(numericString, 10);
      
      // Filter nominal wajar untuk transaksi kantin
      if (!isNaN(amount) && amount >= 500 && amount <= 1000000) {
        return amount;
      }
    }
  }

  return null;
};

/**
 * LOGIKA EKSTRAKSI MERCHANT
 */
const extractMerchant = (text: string): string | null => {
  const cleanText = text.toUpperCase();
  const keywords = ["HMIT", "STORE", "ITS", "SURABAYA"];
  
  for (const key of keywords) {
    if (cleanText.includes(key)) return key;
  }
  return null;
};