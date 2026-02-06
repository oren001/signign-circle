import json
import os

def generate_all_songs():
    """Generate song data for all 292 pages"""
    songs = []
    
    # We have 292 pages (page_001.png through page_292.png)
    for i in range(1, 293):
        page_num = f"{i:03d}"  # Format as 001, 002, etc.
        song = {
            "id": f"book-page-{i}",
            "title": f"שיר {i}",  # "Song {number}" in Hebrew as placeholder
            "type": "image",
            "source": f"songs/page_{page_num}.png",
            "votes": 0,
            "addedBy": "system"
        }
        songs.append(song)
    
    data = {"songs": songs}
    
    # Write to song-data.json
    with open("song-data.json", "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print(f"Generated song data for {len(songs)} songs!")
    print("Note: Song titles are placeholders. Run update_titles.py with songbook.pdf to extract real titles.")

if __name__ == "__main__":
    generate_all_songs()
