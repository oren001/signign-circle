"""
Extract song titles using OCR from PNG images
Requires: pip install pytesseract pillow
Also requires Tesseract OCR to be installed on the system
"""
import json
import os
from PIL import Image
import re

try:
    import pytesseract
    HAS_OCR = True
except ImportError:
    HAS_OCR = False
    print("⚠️  pytesseract not installed. Install with: pip install pytesseract")
    print("⚠️  Also install Tesseract OCR: https://github.com/tesseract-ocr/tesseract")

def extract_title_from_image(image_path):
    """Extract title from song image using OCR"""
    if not HAS_OCR:
        return None
    
    try:
        img = Image.open(image_path)
        
        # Crop to top portion where title usually is (top 20% of image)
        width, height = img.size
        title_region = img.crop((0, 0, width, int(height * 0.2)))
        
        # Extract text using OCR
        text = pytesseract.image_to_string(title_region, lang='heb+eng')
        
        # Get first meaningful line
        lines = [line.strip() for line in text.split('\n') if line.strip()]
        for line in lines:
            # Skip page numbers and very short text
            if len(line) >= 3 and not line.isdigit():
                # Clean up
                line = re.sub(r'\s+', ' ', line)
                return line[:80]  # Limit length
        
        return None
    except Exception as e:
        print(f"Error processing {image_path}: {e}")
        return None

def update_titles_with_ocr():
    """Update song titles using OCR"""
    if not HAS_OCR:
        print("Cannot proceed without pytesseract. Exiting.")
        return
    
    with open("song-data.json", "r", encoding="utf-8") as f:
        data = json.load(f)
    
    songs = data.get("songs", [])
    updated = 0
    failed = []
    
    print(f"Processing {len(songs)} songs with OCR...")
    print("This may take a few minutes...\n")
    
    for i, song in enumerate(songs, 1):
        # Skip if already has a good title (not placeholder)
        if not song["title"].startswith("שיר "):
            continue
        
        image_path = song["source"]
        if os.path.exists(image_path):
            title = extract_title_from_image(image_path)
            if title:
                song["title"] = title
                updated += 1
                print(f"[{i}/{len(songs)}] ✓ {title}")
            else:
                failed.append(song["id"])
                print(f"[{i}/{len(songs)}] ✗ Could not extract from {image_path}")
        
        # Save progress every 50 songs
        if i % 50 == 0:
            with open("song-data.json", "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            print(f"\n💾 Saved progress ({updated} titles updated so far)\n")
    
    # Final save
    with open("song-data.json", "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print(f"\n✅ Finished! Updated {updated} titles using OCR")
    if failed:
        print(f"⚠️  Failed to extract {len(failed)} titles")

if __name__ == "__main__":
    update_titles_with_ocr()
