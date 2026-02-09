
import json
import os
import re

def rebuild_songs():
    mapping_file = 'song_mapping.json'
    
    if not os.path.exists(mapping_file):
        print(f"Error: {mapping_file} not found. Run extract_titles_openrouter.py first.")
        return

    with open(mapping_file, 'r', encoding='utf-8') as f:
        mapping = json.load(f)
    
    new_songs = []
    
    # We expect 292 pages total
    for i in range(1, 293):
        song_id = f"book-page-{i}"
        source = f"songs/page_{i:03d}.png"
        page_key = str(i)
        
        # Get data from mapping
        page_data = mapping.get(page_key, {})
        
        # Handle cases where AI returns a list of results
        if isinstance(page_data, list) and len(page_data) > 0:
            page_data = page_data[0]
            
        if not isinstance(page_data, dict):
            page_data = {}

        title = page_data.get('title', f"עמוד {i}")
        artist = page_data.get('artist', "")
        full_text = page_data.get('fullText', "")
        
        # Special labels for covers
        if i == 1:
            title = "כריכה - Gentle Giant"
        elif i == 292:
            title = "כריכה אחורית - Gentle Giant"
            
        # Format title cleanly
        display_title = title
        if artist:
            display_title = f"{title} / {artist}"
        
        # Create song object
        song = {
            "id": song_id,
            "title": display_title,
            "type": "image",
            "source": source,
            "votes": 0,
            "addedBy": "system",
            "fullText": full_text
        }
        
        # Tag quiet songs
        quiet_keywords = ["Yesterday", "Hey Jude", "Yesterday", "Long and Winding Road", "זמר נוגה", "אדם בתוך עצמו", "אל תפחד"]
        safe_title = (display_title or "").lower()
        safe_text = (full_text or "").lower()
        
        if any(kw.lower() in safe_title or kw.lower() in safe_text for kw in quiet_keywords):
            song["isQuiet"] = True
            
        new_songs.append(song)
    
    # Add User-Requested Extra Songs
    extra_songs = [
        {
            "id": "song-amdursky-15min",
            "title": "15 דקות - אסף אמדורסקי",
            "type": "url",
            "source": "https://www.tab4u.com/tabs/songs/8_%D7%90%D7%A1%D7%A3_%D7%90%D7%9E%D7%93%D7%95%D7%A8%D7%A1%D7%A7%D7%99_-_15_%D7%93%D7%A7%D7%95%D7%AA.html",
            "votes": 0,
            "addedBy": "system",
            "fullText": "אסף אמדורסקי 15 דקות אקורדים מילים יניב הורביץ"
        },
        {
            "id": "song-amdursky-heaven",
            "title": "השמים הכחולים - אסף אמדורסקי",
            "type": "url",
            "source": "https://www.tab4u.com/tabs/songs/47_%D7%90%D7%A1%D7%A3_%D7%90%D7%9E%D7%93%D7%95%D7%A8%D7%A1%D7%A7%D7%99_-_%D7%94%D7%A9%D7%9E%D7%99%D7%9D_%D7%94%D7%9B%D7%97%D7%95%D7%9C%D7%99%D7%9D.html",
            "votes": 0,
            "addedBy": "system",
            "fullText": "השמים הכחולים אסף אמדורסקי אקורדים מילים"
        },
        {
            "id": "song-amdursky-dear",
            "title": "יקירתי - אסף אמדורסקי",
            "type": "url",
            "source": "https://www.tab4u.com/tabs/songs/39_%D7%90%D7%A1%D7%A3_%D7%90%D7%9E%D7%93%D7%95%D7%A8%D7%A1%D7%A7%D7%99_-_%D7%99%D7%A7%D7%99%D7%A8%D7%AA%D7%99.html",
            "votes": 0,
            "addedBy": "system",
            "fullText": "יקירתי אסף אמדורסקי אקורדים מילים לטי גרובמן"
        }
    ]
    
    new_songs.extend(extra_songs)

    # Save the fresh database
    data = {"songs": new_songs}
    with open('song-data.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print(f"Successfully rebuilt song-data.json with {len(new_songs)} songs.")
    print(f"Enriched with lyrics/fullText for all mapped pages.")

if __name__ == "__main__":
    rebuild_songs()
