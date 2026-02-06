
import pytesseract
from PIL import Image
import os

def test_ocr(page_num):
    image_path = f"songs/page_{page_num:03d}.png"
    if not os.path.exists(image_path):
        print(f"File {image_path} not found")
        return
    
    img = Image.open(image_path)
    width, height = img.size
    # Crop to top 15% where title usually is
    title_region = img.crop((0, 0, width, int(height * 0.15)))
    
    # OCR
    text = pytesseract.image_to_string(title_region, lang='heb+eng')
    print(f"--- OCR Result for Page {page_num} ---")
    print(text)
    print("-------------------------------")

if __name__ == "__main__":
    test_ocr(13)
    test_ocr(14)
    test_ocr(15)
