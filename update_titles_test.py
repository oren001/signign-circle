import fitz
import json

def update_first_10_titles(json_path):
    doc = fitz.open("songbook.pdf")
    
    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    songs = data.get("songs", [])
    
    # Map of page index to title based on analyze_pdf output
    titles_map = {
        0: "Gentle Giant Chords Book",
        1: "English Songs Index",
        2: "Hey Jude / The Beatles",
        3: "The Long and Winding Road / The Beatles",
        4: "Yesterday / The Beatles",
        5: "Can’t Help Falling In Love / Elvis Presley",
        6: "Knockin on Heavens Doors / Bob Dylan",
        7: "Nothing Else Matters / Metallica",
        8: "I Talk to the Wind / King Crimson",
        9: "You’ve got a friend / James Taylor",
        10: "More Than Words / Extreme"
    }
    
    updated_count = 0
    for song in songs:
        if song["id"].startswith("book-page-"):
            page_num = int(song["id"].split("-")[-1])
            page_idx = page_num - 1
            if page_idx in titles_map:
                song["title"] = titles_map[page_idx]
                updated_count += 1
    
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print(f"Updated {updated_count} titles in {json_path}")

if __name__ == "__main__":
    update_first_10_titles("song-data.json")
