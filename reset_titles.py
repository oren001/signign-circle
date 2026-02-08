
import json
import re

def reset_to_pages():
    with open('song-data.json', 'r', encoding='utf-8') as f:
        data = json.load(f)

    for song in data['songs']:
        # Extract page number from ID or source
        match = re.search(r'(\d+)', song['id'])
        if match:
            page_num = match.group(1)
            song['title'] = f"עמוד {page_num}"
        else:
            song['title'] = "עמוד ללא שם"
        
        # Strip all features logic from metadata for now
        if 'isQuiet' in song:
            del song['isQuiet']
        
        # Reset votes for fresh start if needed? (Decided to keep votes for now unless user asks)
    
    with open('song-data.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print("Successfully reset all song titles to page numbers.")

if __name__ == "__main__":
    reset_to_pages()
