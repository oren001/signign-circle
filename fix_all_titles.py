import fitz
import json
import os
import re

def clean_title(text):
    """Clean up extracted title text"""
    # Remove common PDF artifacts
    text = text.strip()
    # Remove page numbers at the end
    text = re.sub(r'\s+\d+$', '', text)
    # Remove extra whitespace
    text = ' '.join(text.split())
    return text

def extract_title_from_page(page):
    """Extract the song title from a PDF page"""
    # Try multiple methods to extract the title
    
    # Method 1: Get text blocks and find the largest/first meaningful text
    text_blocks = page.get_text("blocks")
    
    candidates = []
    for block in text_blocks:
        if len(block) >= 5:
            text = block[4].strip()
            # Skip if it's just a page number
            if text.isdigit():
                continue
            # Skip if too short
            if len(text) < 3:
                continue
            # Get first line only (usually the title)
            first_line = text.split('\n')[0].strip()
            if first_line:
                candidates.append({
                    'text': first_line,
                    'y': block[1],  # Y position (top of block)
                    'size': block[3] - block[1]  # Height of block
                })
    
    # Sort by Y position (top to bottom) and size (larger text first)
    if candidates:
        # Prefer text near the top of the page
        candidates.sort(key=lambda x: (x['y'], -x['size']))
        return clean_title(candidates[0]['text'])
    
    # Method 2: Try getting all text and take first meaningful line
    all_text = page.get_text("text")
    lines = [line.strip() for line in all_text.split('\n') if line.strip()]
    for line in lines:
        if len(line) >= 3 and not line.isdigit():
            return clean_title(line)
    
    return None

def update_all_song_names(pdf_path, json_path):
    """Update all song names from PDF"""
    doc = fitz.open(pdf_path)
    
    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    songs = data.get("songs", [])
    updated_count = 0
    failed_pages = []
    
    print(f"Processing {len(songs)} songs...")
    
    for song in songs:
        if "book-page-" in song["id"]:
            page_num = int(song["id"].split("-")[-1])
            
            # Skip cover page
            if page_num == 1:
                continue
                
            try:
                page = doc.load_page(page_num - 1)  # 0-indexed
                title = extract_title_from_page(page)
                
                if title:
                    song["title"] = title
                    updated_count += 1
                    if updated_count % 50 == 0:
                        print(f"Updated {updated_count} titles...")
                else:
                    failed_pages.append(page_num)
                    print(f"⚠️  Could not extract title for page {page_num}")
            except Exception as e:
                failed_pages.append(page_num)
                print(f"❌ Error on page {page_num}: {e}")
    
    # Save updated data
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print(f"\n✅ Finished! Updated {updated_count} song titles from PDF.")
    if failed_pages:
        print(f"⚠️  Failed to extract {len(failed_pages)} titles (pages: {failed_pages[:10]}...)")
    
    doc.close()

if __name__ == "__main__":
    if os.path.exists("songbook.pdf"):
        update_all_song_names("songbook.pdf", "song-data.json")
    else:
        print("❌ songbook.pdf not found. Please ensure it's in the directory.")
