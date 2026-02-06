import fitz
import json
import os

def update_song_names(pdf_path, json_path):
    doc = fitz.open(pdf_path)
    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    songs = data.get("songs", [])
    updated_count = 0
    
    for song in songs:
        if "book-page-" in song["id"]:
            page_num = int(song["id"].split("-")[-1])
            page = doc.load_page(page_num - 1)
            
            # Extract first meaningful text line
            text_blocks = page.get_text("blocks")
            title = ""
            
            # Skip page number blocks and find the first real text
            for b in text_blocks:
                content = b[4].strip()
                if content and not content.isdigit() and len(content) > 2:
                    # Clean up common PDF artifacts
                    title = content.split('\n')[0].strip()
                    break
            
            if title:
                # Limit length and clean
                title = title[:60]
                song["title"] = title
                updated_count += 1
                if updated_count % 50 == 0:
                    print(f"Updated {updated_count} titles...")

    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print(f"Finished! Updated {updated_count} song titles from PDF metadata.")

if __name__ == "__main__":
    # We still need songbook.pdf if it was deleted
    if os.path.exists("songbook.pdf"):
        update_song_names("songbook.pdf", "song-data.json")
    else:
        print("songbook.pdf not found. Please ensure it's in the directory.")
