import { createWorker } from "tesseract.js";

// ============================================================
// TYPES & INTERFACES
// ============================================================

export interface TransactionId {
  label: string;
  value: string;
}

export interface OCRResult {
  rawText: string;
  cleanedText: string;
  amount: number | null;
  merchantName: string | null;
  transactionIds: TransactionId[];
  paymentMethod: string | null;
  transactionDate: Date | null;
  transactionDateRaw: string | null;
  isSuccess: boolean;
  validationErrors: string[];
  processingTimeMs?: number;
  error?: string;
}

// ============================================================
// MODULE 1: OPENCV PRE-PROCESSING — FAST MODE
//
// Dipangkas dari 8 steps → 3 steps:
//   DIHAPUS: Deskew (Hough transform mahal ~150ms)
//   DIHAPUS: CLAHE (alokasi object tambahan ~80ms)
//   DIHAPUS: Gamma LUT (iterasi 256 entry ~30ms)
//   DIHAPUS: Unsharp mask (2x Gaussian ~100ms)
//   DIPERTAHANKAN: Upscale 2x — paling berpengaruh ke akurasi Tesseract
//   DIPERTAHANKAN: Median Blur — noise removal paling ringan
//   DIPERTAHANKAN: Adaptive Threshold — wajib untuk binarisasi
//
// Estimasi penghematan: ~360–460ms per gambar
//
// Trade-off:
//   - Gambar miring > 10° akan turun akurasi (deskew dihapus)
//   - Low-light ekstrem sedikit lebih buruk (CLAHE dihapus)
//   - Foto backlight berat sedikit lebih buruk (gamma dihapus)
//   Untuk foto struk normal dari kamera HP modern, perbedaannya minimal.
// ============================================================

export const preprocessImageWithOpenCV = async (imageBlob: Blob): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(imageBlob);
    img.src = objectUrl;

    img.onload = () => {
      const mats: any[] = [];
      const track = (m: any) => { mats.push(m); return m; };

      try {
        const cv = (window as any).cv;
        if (!cv?.Mat) {
          console.warn("⚠️ [OpenCV] Tidak tersedia, fallback gambar asli.");
          URL.revokeObjectURL(objectUrl);
          resolve(objectUrl);
          return;
        }

        // ── Step 1: Grayscale ────────────────────────────────────
        const src  = track(cv.imread(img));
        const gray = track(new cv.Mat());
        cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);

        // ── Step 2: Upscale 2x ──────────────────────────────────
        // Karakter ≥ 20px tinggi = ambang minimum Tesseract LSTM.
        // Ini step paling berpengaruh ke akurasi, biayanya relatif murah.
        // Resolusi input > 1200px lebar: skip upscale, sudah cukup besar.
        const skipUpscale = img.naturalWidth > 1200;
        const upscaled = track(new cv.Mat());
        if (skipUpscale) {
          gray.copyTo(upscaled);
        } else {
          cv.resize(gray, upscaled, new cv.Size(0, 0), 2.0, 2.0, cv.INTER_LINEAR);
        }

        // ── Step 3: Median Blur ──────────────────────────────────
        // ksize=3: hilangkan salt-and-pepper noise sensor kamera.
        // Lebih murah dari Gaussian, lebih aman untuk tepi karakter.
        const denoised = track(new cv.Mat());
        cv.medianBlur(upscaled, denoised, 3);

        // ── Step 4: Adaptive Threshold ───────────────────────────
        // blockSize=15, C=4: toleran terhadap gradasi cahaya lokal.
        // C=4 (lebih kecil dari default 8) agar teks tipis tidak putus.
        const dst = track(new cv.Mat());
        cv.adaptiveThreshold(
          denoised, dst, 255,
          cv.ADAPTIVE_THRESH_GAUSSIAN_C,
          cv.THRESH_BINARY,
          15, 4
        );

        const canvas = document.createElement("canvas");
        cv.imshow(canvas, dst);
        const processedUrl = canvas.toDataURL("image/png");

        URL.revokeObjectURL(objectUrl);
        console.log(`✅ [OpenCV] Fast: Grayscale → ${skipUpscale ? "NoUpscale" : "Scale2x"} → MedianBlur → AdaptiveThresh`);
        resolve(processedUrl);

      } catch (err) {
        console.error("❌ [OpenCV] Gagal, fallback gambar asli:", err);
        URL.revokeObjectURL(objectUrl);
        resolve(objectUrl);
      } finally {
        mats.forEach(m => { try { m?.delete(); } catch (_) {} });
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(objectUrl);
    };
  });
};

// ============================================================
// MODULE 2: TESSERACT.JS — SINGLE PASS
//
// Perbedaan dari versi optimal:
//   DIHAPUS: Multi-pass (4 kombinasi scale × PSM)
//   DIHAPUS: Per-word confidence scoring
//   DIPERTAHANKAN: Singleton worker (init hanya sekali)
//   DIPERTAHANKAN: LSTM only (OEM 1) — lebih akurat dari legacy
//   DIPERTAHANKAN: PSM 6 — cocok untuk mayoritas layout struk
//
// Estimasi penghematan: 3–15 detik (skip 3 pass tambahan)
// ============================================================

let globalWorker: Awaited<ReturnType<typeof createWorker>> | null = null;

const getTesseractWorker = async () => {
  if (!globalWorker) {
    console.log("⚙️ [OCR] Init Tesseract Worker...");
    globalWorker = await createWorker("ind+eng");
    await globalWorker.setParameters({
      tessedit_char_whitelist:
        "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz.,/:- ()+",
      tessedit_pageseg_mode: "6" as any,
      tessedit_ocr_engine_mode: "1" as any,
    });
  }
  return globalWorker;
};

// ============================================================
// MODULE 3: MAIN OCR PIPELINE — SINGLE PASS
// ============================================================

export const performOCR = async (imageBlob: Blob): Promise<OCRResult> => {
  const startTime = Date.now();
  let processedImageUrl = "";

  try {
    const worker = await getTesseractWorker();

    processedImageUrl = await preprocessImageWithOpenCV(imageBlob);

    const { data: { text } } = await worker.recognize(processedImageUrl);

    if (processedImageUrl.startsWith("blob:")) {
      URL.revokeObjectURL(processedImageUrl);
    }

    const processingTimeMs = Date.now() - startTime;

    if (processingTimeMs > 5000) {
      console.warn(`⚠️ [Perf] OCR ${processingTimeMs}ms melebihi 5000ms`);
    }

    if (!text || text.trim().length < 5) {
      return makeFailResult({
        rawText: text || "",
        processingTimeMs,
        error: "Teks tidak terbaca. Pastikan gambar fokus, tidak terpotong, dan cukup cahaya.",
      });
    }

    const cleanedText = cleanOCRText(text);
    console.log("📄 [OCR] Cleaned Text:\n", cleanedText);

    const amount         = extractNominal(cleanedText);
    const merchant       = extractMerchant(cleanedText);
    const transactionIds = extractTransactionIds(cleanedText);
    const paymentMethod  = extractPaymentMethod(cleanedText);
    const { date, raw }  = extractDateTime(cleanedText);

    const validationErrors: string[] = [];
    if (amount === null)             validationErrors.push("Nominal pembayaran tidak ditemukan.");
    if (merchant === null)           validationErrors.push("Merchant 'HMIT STORE ITS' tidak terdeteksi.");
    if (date === null)               validationErrors.push("Tanggal & waktu transaksi tidak ditemukan.");
    if (transactionIds.length === 0) validationErrors.push("ID transaksi tidak ditemukan.");

    const isSuccess = validationErrors.length === 0;

    console.log(`🧠 [OCR] Result:`, { amount, merchant, transactionIds, paymentMethod, isSuccess });

    return {
      rawText: text,
      cleanedText,
      amount,
      merchantName:       merchant,
      transactionIds,
      paymentMethod,
      transactionDate:    date,
      transactionDateRaw: raw,
      isSuccess,
      validationErrors,
      processingTimeMs,
    };

  } catch (err) {
    console.error("❌ [OCR] Runtime Error:", err);
    if (processedImageUrl.startsWith("blob:")) URL.revokeObjectURL(processedImageUrl);
    return makeFailResult({
      rawText: "",
      processingTimeMs: Date.now() - startTime,
      error: "Mesin OCR mengalami error saat memproses gambar.",
    });
  }
};

const makeFailResult = (opts: {
  rawText: string;
  processingTimeMs: number;
  error: string;
}): OCRResult => ({
  rawText:            opts.rawText,
  cleanedText:        "",
  amount:             null,
  merchantName:       null,
  transactionIds:     [],
  paymentMethod:      null,
  transactionDate:    null,
  transactionDateRaw: null,
  isSuccess:          false,
  validationErrors:   [opts.error],
  processingTimeMs:   opts.processingTimeMs,
  error:              opts.error,
});

// ============================================================
// MODULE 4: TEXT CLEANING
// ============================================================

const cleanOCRText = (rawText: string): string => {
  return rawText
    .replace(/\r\n/g, "\n").replace(/\r/g, "\n")
    .toUpperCase()
    .replace(/[ \t]+$/gm, "")
    .replace(/\|/g, "1")
    .replace(/\brn\b/gi, "M")
    .replace(/(?<!\w)O(?!\w)/g, "0")
    .replace(/(?<!\w)I(?!\w)/g, "1")
    .replace(/(?<!\w)L(?!\w)/g, "1")
    .replace(/S(?=\d{3,})/g, "5")
    .replace(/B(?=\d{3,})/g, "8")
    .replace(/[^A-Z0-9.,\-\/:()\s+]/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
};

// ============================================================
// MODULE 5: NOMINAL EXTRACTOR
// ============================================================

const parseIndonesianNumber = (raw: string): number | null => {
  const cleaned = raw.replace(/\s/g, "");
  let numStr = cleaned;
  if (/^(\d{1,3})(\.\d{3})+$/.test(cleaned)) {
    numStr = cleaned.replace(/\./g, "");
  } else if (/^(\d{1,3})(,\d{3})+$/.test(cleaned)) {
    numStr = cleaned.replace(/,/g, "");
  } else {
    numStr = cleaned.replace(/[.,]\d{1,2}$/, "").replace(/[.,]/g, "");
  }
  const result = parseInt(numStr, 10);
  return isNaN(result) ? null : result;
};

const extractNominal = (cleanedText: string): number | null => {
  // Skema dari kode asli + toleransi OCR tambahan.
  // Urutan: paling spesifik → paling umum (fallback).
  const patterns: RegExp[] = [
    /\bR[Pp]\.?\s{0,2}([0-9]{1,3}(?:[.,][0-9]{3})*(?:[.,][0-9]{1,2})?)/,  // ← fix
    /(?:TOTAL|BAYAR|NOMINAL|AMOUNT|JUMLAH|TRANSFER|TAGIHAN)\s?([0-9]{1,3}(?:[.,][0-9]{3})*)/i,
    /([0-9]{1,3}(?:[.,][0-9]{3})*)\s?(?:MEMBAYAR|BERHASIL|SUCCESS|COMPLETED|SELESAI)/i,
    /(?:^|\s)([0-9]{1,3}[.,][0-9]{3})(?:\s|$)/m,
  ];

  for (const regex of patterns) {
    const match = cleanedText.match(regex);
    if (match?.[1]) {
      const amount = parseIndonesianNumber(match[1]);
      // Range: Rp100 – Rp10.000.000
      if (amount !== null && amount >= 100 && amount <= 10_000_000) return amount;
    }
  }

  return null;
};


// ============================================================
// MODULE 6: MERCHANT VALIDATOR
// ============================================================

const extractMerchant = (cleanedText: string): string | null => {
  const normText = cleanedText.replace(/[\s\-_]+/g, " ").trim();
  const matchCount = [
    /H[MN][I1L][T7FL]/i.test(normText),
    /S[T7][O0][R][E3]/i.test(normText),
    /[I1][T7][S5]/i.test(normText),
  ].filter(Boolean).length;
  return matchCount >= 2 ? "HMIT STORE ITS" : null;
};

// ============================================================
// MODULE 7: TRANSACTION ID EXTRACTOR
// ============================================================

const buildLabelRegex = (label: string, valuePattern: string): RegExp => {
  const noised = label
    .replace(/\./g, "\\.?")
    .replace(/ /g, "\\s{0,3}")
    .replace(/O/g, "[O0]")
    .replace(/I/g, "[I1L]")
    .replace(/N/g, "[NMH]")   // ← tambah H
    .replace(/S/g, "[S5]")
    .replace(/B/g, "[B8]")
    .replace(/G/g, "[G6]")
    .replace(/Z/g, "[Z2]");
  return new RegExp(`${noised}[\\s\\t]{0,3}:?[\\s\\t]{0,5}(${valuePattern})`, "im");
};

const AL  = "[A-Z0-9]{8,40}";
const ALD = "[A-Z0-9][A-Z0-9\\-]{7,39}";
const AS  = "[A-Z0-9\\-]{4,20}";
const NL  = "[0-9]{10,25}";
const NM  = "[0-9]{6,20}";
const NS  = "[0-9]{6,8}";

const COMPILED_LABELS = [
  ["TRANSAKSI SN", AL,  "Transaksi SN"],
  ["ORDER SN",     NL,  "Order SN"],
  ["ORDER ID",     NL,  "Order ID"],
  ["ID TRANSAKSI", AL,  "ID Transaksi"],
  ["NO. TRANSAKSI",AL,  "No. Transaksi"],
  ["NO TRANSAKSI", AL,  "No. Transaksi"],
  ["NO. REFERENSI",AL,  "No. Referensi"],
  ["NO REFERENSI", AL,  "No. Referensi"],
  ["REFERENSI",    AL,  "Referensi"],
  ["ID PEMBAYARAN",AL,  "ID Pembayaran"],
  ["KODE UNIK",    AS,  "Kode Unik"],
  ["NOMOR TRANSAKSI", NL, "Nomor Transaksi"],
  ["ID TRANSFER",  AL,  "ID Transfer"],
  ["PAYMENT ID",   AL,  "Payment ID"],
  ["INVOICE NO",   ALD, "Invoice No."],
  ["KODE TRANSAKSI",AL, "Kode Transaksi"],
  ["NOMOR REFERENSI",NL,"Nomor Referensi"],
  ["KODE OTORISASI",NS, "Kode Otorisasi"],
  ["TRANSACTION ID",AL, "Transaction ID"],
  ["REFERENCE NUMBER",AL,"Reference Number"],
  ["REFERENCE NO", AL,  "Reference No."],
  ["QRIS ID",      AL,  "QRIS ID"],
  ["REF. NO",      AL,  "Ref No."],
  ["REF NO",       AL,  "Ref No."],
  ["APPROVAL CODE",AS,  "Approval Code"],
  ["TRACE NO",     NM,  "Trace No."],
  ["TRACE NO.",    NM,  "Trace No."],
].map(([label, pat, std]) => ({
  regex: buildLabelRegex(label as string, pat as string),
  standardLabel: std as string,
}));

const NON_ID_KEYWORDS = new Set([
  "HMIT","STORE","QRIS","SHOPEE","GOPAY","DANA","SHOPEEPAY",
  "MANDIRI","BRIMO","LINKAJA","JENIUS","SEABANK","FLIP","TOKOPEDIA",
  "SURABAYA","JAKARTA","BANDUNG","INDONESIA",
  "BERHASIL","SUCCESS","PENDING","FAILED",
  "TOTAL","NOMINAL","PEMBAYARAN","TRANSAKSI",
]);

const normalizeIdValue = (v: string) => v.replace(/\s+/g, "").toUpperCase();

const extractTransactionIds = (cleanedText: string): TransactionId[] => {
  const results: TransactionId[] = [];
  const seen = new Set<string>();

  // Lapisan 1: Label-based
  for (const { regex, standardLabel } of COMPILED_LABELS) {
    const match = cleanedText.match(regex);
    if (match?.[1]) {
      const value = match[1].trim();
      const norm  = normalizeIdValue(value);
      if (!seen.has(norm) && value.length >= 4) {
        seen.add(norm);
        results.push({ label: standardLabel, value });
      }
    }
  }

  // Lapisan 2: Proximity search (fallback)
  if (results.length === 0) {
    const proximityLabels = [
      { kw: /TRANSAKSI|TRANSACTION/i, lbl: "ID Transaksi"  },
      { kw: /REFERENSI|REFERENCE/i,   lbl: "No. Referensi" },
      { kw: /ORDER|INVOICE/i,          lbl: "Order ID"      },
      { kw: /APPROVAL/i,              lbl: "Approval Code"  },
      { kw: /PAYMENT/i,               lbl: "Payment ID"     },
    ];
    for (const { kw, lbl } of proximityLabels) {
      const idx = cleanedText.search(kw);
      if (idx === -1) continue;
      const win = cleanedText.slice(idx, idx + 120);
      const tok = win.match(/[A-Z0-9\-]{8,30}/);
      if (tok?.[0]) {
        const value = tok[0].replace(/^-+|-+$/g, "");
        const norm  = normalizeIdValue(value);
        const isMixed   = /[A-Z]/.test(value) && /[0-9]/.test(value);
        const isLongNum = /^[0-9]{12,}$/.test(value);
        if (!NON_ID_KEYWORDS.has(value.replace(/-/g,"")) && (isMixed || isLongNum) && !seen.has(norm)) {
          seen.add(norm);
          results.push({ label: lbl, value });
          break;
        }
      }
    }
  }

  // Lapisan 3: Heuristik (fallback terakhir)
  if (results.length === 0) {
    const best = [...cleanedText.matchAll(/\b([A-Z0-9]{10,30})\b/g)]
      .map(m => m[1])
      .filter(v => {
        const mixed = /[A-Z]/.test(v) && /[0-9]/.test(v);
        const longN = /^[0-9]{14,}$/.test(v);
        return (mixed || longN) && !NON_ID_KEYWORDS.has(v) && !/^[A-Z]+$/.test(v);
      })
      .sort((a, b) => {
        const sA = /[A-Z]/.test(a) && /[0-9]/.test(a) ? 1 : 0;
        const sB = /[A-Z]/.test(b) && /[0-9]/.test(b) ? 1 : 0;
        return sB - sA;
      })[0];
    if (best && !seen.has(normalizeIdValue(best))) {
      results.push({ label: "ID Transaksi", value: best });
    }
  }

  return results;
};

// ============================================================
// MODULE 8: PAYMENT METHOD EXTRACTOR
// ============================================================

const PAYMENT_PATTERNS: Array<{ regex: RegExp; name: string }> = [
  { regex: /SHOPEEPAY|SHOPEE\s?PAY/i,         name: "ShopeePay"           },
  { regex: /GOPAY|GO\s?PAY/i,                 name: "GoPay"               },
  { regex: /\bOVO\b/i,                        name: "OVO"                 },
  { regex: /\bDANA\b/i,                       name: "DANA"                },
  { regex: /LINKAJA|LINK\s?AJA/i,             name: "LinkAja"             },
  { regex: /TOKOPEDIA\s?PAY|TOKOCASH/i,       name: "Tokopedia Pay"       },
  { regex: /\bFLIP\b/i,                       name: "Flip"                },
  { regex: /SAKUKU/i,                          name: "Sakuku (BCA)"        },
  { regex: /BRIMO|BRI\s?MOBILE/i,             name: "BRImo"               },
  { regex: /LIVIN|(?<!\w)MANDIRI(?!\s+SYARIAH)/i, name: "Livin by Mandiri"},
  { regex: /BSI\s?MOBILE|MANDIRI\s?SYARIAH/i, name: "BSI Mobile"         },
  { regex: /BNI\s?MOBILE|YONO/i,              name: "BNI Mobile"          },
  { regex: /JAGO/i,                            name: "Bank Jago"           },
  { regex: /SEABANK/i,                         name: "SeaBank"             },
  { regex: /JENIUS/i,                          name: "Jenius (BTPN)"       },
  { regex: /QRIS/i,                            name: "QRIS"                },
  { regex: /VIRTUAL\s?ACCOUNT/i,              name: "Virtual Account"     },
  { regex: /KARTU\s?DEBIT|DEBIT\s?CARD/i,    name: "Kartu Debit"         },
  { regex: /KARTU\s?KREDIT|CREDIT\s?CARD/i,  name: "Kartu Kredit"        },
  { regex: /SALDO\s+(\w+)/i,                  name: "Saldo"               },
];

const SALDO_MAP: Record<string, string> = {
  SHOPEE: "ShopeePay", SHOPEEPAY: "ShopeePay",
  GOPAY: "GoPay", OVO: "OVO", DANA: "DANA", LINKAJA: "LinkAja", FLIP: "Flip",
};

const extractPaymentMethod = (cleanedText: string): string | null => {
  for (const { regex, name } of PAYMENT_PATTERNS) {
    const m = cleanedText.match(regex);
    if (m) {
      if (name === "Saldo" && m[1]) {
        const key = m[1].trim().toUpperCase();
        return SALDO_MAP[key] ?? `Saldo ${m[1].trim()}`;
      }
      return name;
    }
  }
  return null;
};

// ============================================================
// MODULE 9: DATE & TIME EXTRACTOR
// ============================================================

const MONTH_MAP: Record<string, number> = {
  JAN:1,FEB:2,MAR:3,APR:4,MAY:5,JUN:6,JUL:7,AUG:8,SEP:9,OCT:10,NOV:11,DEC:12,
  JANUARY:1,FEBRUARY:2,MARCH:3,APRIL:4,JUNE:6,JULY:7,AUGUST:8,SEPTEMBER:9,
  OCTOBER:10,NOVEMBER:11,DECEMBER:12,
  MEI:5,AGU:8,OKT:10,DES:12,PEB:2,NOP:11,
  JANUARI:1,FEBRUARI:2,MARET:3,JUNI:6,JULI:7,AGUSTUS:8,OKTOBER:10,DESEMBER:12,
};

interface DateTimeResult { date: Date | null; raw: string | null; }

const parseTime = (h: number, m: number, s = 0, ap?: string) => {
  let hour = h;
  if (ap) { if (/PM/i.test(ap) && hour < 12) hour += 12; if (/AM/i.test(ap) && hour === 12) hour = 0; }
  return { h: hour, m, s };
};

const extractDateTime = (cleanedText: string): DateTimeResult => {
  const text = cleanedText
    .replace(/(\d{2})\.(\d{2})(?=\s|$)/g, "$1:$2")
    .replace(/\b([0-1]?\d|2[0-3])\s([0-5]\d)\b(?!\d)/g, "$1:$2")
    .toUpperCase();

  const patterns: Array<{ r: RegExp; p: (m: RegExpMatchArray) => Date | null }> = [
    // "29 Apr 2026, 08:31 PM"
    { r: /(\d{1,2})\s+([A-Z]{3,})\s+(\d{4})[,\s]+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?/i,
      p: m => { const mo = MONTH_MAP[m[2].toUpperCase()]; if (!mo) return null; const {h,m:mn,s} = parseTime(+m[4],+m[5],+(m[6]??0),m[7]); return new Date(+m[3],mo-1,+m[1],h,mn,s); } },
    // "Apr 29, 2026 at 8:31 PM"
    { r: /([A-Z]{3,})\s+(\d{1,2}),?\s+(\d{4})\s+(?:AT\s+)?(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?/i,
      p: m => { const mo = MONTH_MAP[m[1].toUpperCase()]; if (!mo) return null; const {h,m:mn,s} = parseTime(+m[4],+m[5],+(m[6]??0),m[7]); return new Date(+m[3],mo-1,+m[2],h,mn,s); } },
    // "29/04/2026 20:31"
    { r: /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?/i,
      p: m => { const {h,m:mn,s} = parseTime(+m[4],+m[5],+(m[6]??0),m[7]); return new Date(+m[3],+m[2]-1,+m[1],h,mn,s); } },
    // ISO 8601
    { r: /(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/i,
      p: m => new Date(+m[1],+m[2]-1,+m[3],+m[4],+m[5],+(m[6]??0)) },
    // "2026/04/29 20:31"
    { r: /(\d{4})[\/](\d{2})[\/](\d{2})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?/i,
      p: m => { const {h,m:mn,s} = parseTime(+m[4],+m[5],+(m[6]??0),m[7]); return new Date(+m[1],+m[2]-1,+m[3],h,mn,s); } },
    // "29 April 2026 pukul 20:31"
    { r: /(\d{1,2})\s+([A-Z]+)\s+(\d{4})(?:\s+(?:PUKUL|JAM|AT))?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?/i,
      p: m => { const mo = MONTH_MAP[m[2].toUpperCase()]; if (!mo) return null; const {h,m:mn,s} = parseTime(+m[4],+m[5],+(m[6]??0),m[7]); return new Date(+m[3],mo-1,+m[1],h,mn,s); } },
    // "HARI INI / KEMARIN, 20:31"
    { r: /\b(HARI\s+INI|KEMARIN|TODAY|YESTERDAY)\b[,\s]+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?/i,
      p: m => { const b = new Date(); if (/KEMARIN|YESTERDAY/i.test(m[1])) b.setDate(b.getDate()-1); const {h,m:mn,s} = parseTime(+m[2],+m[3],+(m[4]??0),m[5]); return new Date(b.getFullYear(),b.getMonth(),b.getDate(),h,mn,s); } },
  ];

  for (const { r, p } of patterns) {
    const match = text.match(r);
    if (match) {
      try {
        const date = p(match);
        if (date && !isNaN(date.getTime())) {
          const yr = date.getFullYear();
          if (yr >= 2022 && yr <= 2027) return { date, raw: match[0].trim() };
        }
      } catch (_) { continue; }
    }
  }
  return { date: null, raw: null };
};

// ============================================================
// MODULE 10: DATE VALIDATOR
// ============================================================

export interface DateValidationResult {
  isValid: boolean;
  reason?: string;
}

export const validateTransactionDate = (
  transactionDate: Date | null,
  maxAgeMinutes = 5
): DateValidationResult => {
  if (!transactionDate) return { isValid: false, reason: "Tanggal transaksi tidak ditemukan." };
  const now = new Date();
  if (transactionDate > now) return {
    isValid: false,
    reason: `Tanggal transaksi (${transactionDate.toLocaleString("id-ID")}) berada di masa depan.`,
  };
  const diffMinutes = (now.getTime() - transactionDate.getTime()) / 60_000;
  if (diffMinutes > maxAgeMinutes) {
    return {
      isValid: false,
      reason: `Selisih waktu ${Math.floor(diffMinutes)} menit melebihi batas ${maxAgeMinutes} menit.`,
    };
  }
  return { isValid: true };
};

// ============================================================
// CLEANUP
// ============================================================

export const destroyOCRWorker = async (): Promise<void> => {
  if (globalWorker) {
    await globalWorker.terminate();
    globalWorker = null;
    console.log("🗑️ [OCR] Worker terminated.");
  }
};