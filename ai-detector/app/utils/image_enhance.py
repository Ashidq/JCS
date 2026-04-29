import cv2
import numpy as np

def auto_brightness_contrast(image):
    # Gunakan LAB space untuk memproses cahaya tanpa merusak warna
    lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    
    # ClipLimit 1.2 - 1.5 biasanya sweet spot untuk layar HP
    clahe = cv2.createCLAHE(clipLimit=1.2, tileGridSize=(8,8))
    cl = clahe.apply(l)
    
    limg = cv2.merge((cl, a, b))
    return cv2.cvtColor(limg, cv2.COLOR_LAB2BGR)

def clean_noise(image):
    # Menggunakan Fast Non-Local Means Denoising untuk hasil yang lebih bersih dari bilateral
    # h=10 adalah kekuatan filter. Jika terlalu blur, turunkan ke 7.
    return cv2.fastNlMeansDenoisingColored(image, None, 10, 10, 7, 21)

def sharpen_clean(image):
    # Unsharp masking: Memberikan kesan tajam tanpa bintik kasar
    gaussian = cv2.GaussianBlur(image, (0, 0), 3)
    return cv2.addWeighted(image, 1.5, gaussian, -0.5, 0)

def enhance_image(image):
    """
    Pipeline V2: Fokus pada kebersihan teks untuk OCR
    """
    # 1. Normalkan cahaya agar teks muncul
    img = auto_brightness_contrast(image)
    
    # 2. Hapus noise bintik-bintik (grain)
    img = clean_noise(img)
    
    # 3. Tajamkan tepi karakter
    img = sharpen_clean(img)
    
    return img