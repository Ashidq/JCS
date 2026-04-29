import cv2
import numpy as np
from app.services.scorer import payment_screen_score
from app.utils.image import four_point_warp

def detect_best_screen(image):
    """
    Mendeteksi area layar bukti pembayaran terbaik menggunakan deteksi tepi 
    dengan mekanisme fallback adaptive thresholding.
    """
    # Pre-processing dasar
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    blurred = cv2.medianBlur(gray, 5)

    # --- STRATEGI 1: Canny Edge Detection (Efisien untuk kontras standar) ---
    high_thresh, _ = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    low_thresh = 0.5 * high_thresh
    edges = cv2.Canny(blurred, low_thresh, high_thresh)
    
    # Dilatasi untuk menyambung tepi yang terputus akibat pantulan cahaya
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3,3))
    edges = cv2.dilate(edges, kernel, iterations=1)

    best_crop, best_score = _find_contours_and_score(image, edges)

    # --- STRATEGI 2: Fallback Adaptive Threshold (Untuk kasus over-exposure/putih polos) ---
    # Jika Strategi 1 gagal menemukan layar (score 0) atau score terlalu rendah (< 0.5)
    if best_crop is None or best_score < 0.5:
        # Invert adaptive threshold seringkali lebih baik menangkap objek putih di latar terang
        fallback_edges = cv2.adaptiveThreshold(
            blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
            cv2.THRESH_BINARY_INV, 11, 2
        )
        
        f_crop, f_score = _find_contours_and_score(image, fallback_edges)
        
        if f_score > best_score:
            best_score = f_score
            best_crop = f_crop

    return best_crop, best_score

def _find_contours_and_score(original_image, processed_image):
    """
    Helper function untuk mencari kontur dan menghitung score dari image yang diproses.
    """
    contours, _ = cv2.findContours(
        processed_image,
        cv2.RETR_EXTERNAL,
        cv2.CHAIN_APPROX_SIMPLE
    )

    best_crop = None
    best_score = 0.0
    
    h, w = original_image.shape[:2]
    min_area = h * w * 0.1  # Minimal 10% dari luas gambar

    for cnt in sorted(contours, key=cv2.contourArea, reverse=True)[:15]:
        area = cv2.contourArea(cnt)
        if area < min_area:
            continue

        peri = cv2.arcLength(cnt, True)
        approx = cv2.approxPolyDP(cnt, 0.02 * peri, True)

        # Mencari objek segi empat (layar HP biasanya terdeteksi 4-6 titik)
        if 4 <= len(approx) <= 6:
            crop = four_point_warp(original_image, approx)
            if crop is not None:
                score = payment_screen_score(crop)
                if score > best_score:
                    best_score = score
                    best_crop = crop
                    
    return best_crop, best_score