import cv2
import numpy as np


def enhance_image(image: np.ndarray) -> np.ndarray:
    h, w = image.shape[:2]
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    # Gambar screenshot e-wallet: mean >200, noise <200 Laplacian
    # Tidak perlu CLAHE atau unsharp agresif — hanya pertajam ringan
    blurred = cv2.GaussianBlur(gray, (0, 0), 1.0)
    sharpened = cv2.addWeighted(gray, 1.2, blurred, -0.2, 0)

    # blockSize=21 C=8 — lebih stabil untuk background putih luas
    binarized = cv2.adaptiveThreshold(
        sharpened, 255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY,
        21, 8   # ← sebelumnya 13, 4
    )

    # INTER_NEAREST untuk gambar biner (bukan INTER_CUBIC)
    if w < 900:
        binarized = cv2.resize(
            binarized, (w * 2, h * 2),
            interpolation=cv2.INTER_NEAREST  # ← sebelumnya INTER_CUBIC
        )

    return cv2.cvtColor(binarized, cv2.COLOR_GRAY2BGR)