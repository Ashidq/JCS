import cv2
import numpy as np


# =========================
# ORDER POINTS
# =========================
def order_points(pts):
    pts = pts.reshape(4, 2).astype("float32")

    s = pts.sum(axis=1)
    d = np.diff(pts, axis=1).ravel()

    return np.array([
        pts[np.argmin(s)],
        pts[np.argmin(d)],
        pts[np.argmax(s)],
        pts[np.argmax(d)],
    ], dtype="float32")


# =========================
# ASPECT RATIO NORMALIZER
# =========================
def normalize_aspect_ratio(width, height):
    if width == 0 or height == 0:
        return width, height

    is_portrait = height >= width
    TARGET_RATIO = 16 / 9 if is_portrait else 9 / 16

    current_ratio = height / width

    if current_ratio > TARGET_RATIO:
        width = int(height / TARGET_RATIO)
    else:
        height = int(width * TARGET_RATIO)

    return width, height


# =========================
# QUALITY ANALYSIS
# =========================
def analyze_image_quality(image):
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    brightness = np.mean(gray)
    blur_score = cv2.Laplacian(gray, cv2.CV_64F).var()

    return brightness, blur_score


# =========================
# ENHANCE IMAGE (OCR OPTIMIZED FINAL)
# =========================
def enhance_image(image):

    brightness, blur_score = analyze_image_quality(image)

    # =========================
    # 1. LOW LIGHT FIX (Gamma correction)
    # =========================
    if brightness < 90:
        gamma = 1.4
        inv_gamma = 1.0 / gamma

        table = np.array([
            ((i / 255.0) ** inv_gamma) * 255
            for i in np.arange(256)
        ]).astype("uint8")

        image = cv2.LUT(image, table)

    # =========================
    # 2. DENOISING (FIXED ORDER)
    # =========================
    image = cv2.medianBlur(image, 3)

    if brightness < 100:
        image = cv2.fastNlMeansDenoisingColored(image, None, 10, 10, 7, 21)
    else:
        image = cv2.bilateralFilter(image, 7, 50, 50)

    # =========================
    # 3. CLAHE (NO THRESHOLDING)
    # =========================
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8))
    enhanced = clahe.apply(gray)

    # =========================
    # 4. UN-SHARP MASKING (SMOOTH SHARPEN)
    # =========================
    gaussian = cv2.GaussianBlur(enhanced, (0, 0), sigmaX=1.2)

    # unsharp formula:
    # sharpened = original * (1 + amount) - blurred * amount
    amount = 1.2
    sharpened = cv2.addWeighted(enhanced, 1 + amount, gaussian, -amount, 0)

    # =========================
    # 5. BACK TO BGR
    # =========================
    return cv2.cvtColor(sharpened, cv2.COLOR_GRAY2BGR)


# =========================
# PERSPECTIVE WARP
# =========================
def four_point_warp(image, pts):
    rect = order_points(pts)
    tl, tr, br, bl = rect

    width = int(max(
        np.linalg.norm(br - bl),
        np.linalg.norm(tr - tl)
    ))

    height = int(max(
        np.linalg.norm(tr - br),
        np.linalg.norm(tl - bl)
    ))

    if width < 100 or height < 100:
        return None

    width, height = normalize_aspect_ratio(width, height)

    MAX_SIZE = 1024
    scale = min(MAX_SIZE / max(width, height), 1.0)

    width = int(width * scale)
    height = int(height * scale)

    dst = np.array([
        [0, 0],
        [width - 1, 0],
        [width - 1, height - 1],
        [0, height - 1]
    ], dtype="float32")

    matrix = cv2.getPerspectiveTransform(rect, dst)
    warped = cv2.warpPerspective(image, matrix, (width, height))

    # FINAL PIPELINE
    warped = enhance_image(warped)

    return warped