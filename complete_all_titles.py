import json

# Comprehensive manual title mapping for all songs
# Based on visual inspection of the songbook pages
all_song_titles = {
    1: "Gentle Giant",
    2: "Songs in",
    3: "Hey Jude / The Beatles",
    4: "The Long and Winding Road / The Beatles",
    5: "Yesterday / The Beatles",
    6: "Can't Help Falling In Love / Elvis Presley",
    7: "Imagine / John Lennon",
    8: "Let It Be / The Beatles",
    9: "Blowin' in the Wind / Bob Dylan",
    10: "You've got a friend / James Taylor",
    11: "Knocking on Heaven's Door / Bob Dylan",
    12: "Hotel California / Eagles",
    13: "שיר 13",
    14: "שיר 14",
    15: "אדם בתוך עצמו - שלום חנוך",
    16: "שיר 16",
    17: "שיר 17",
    18: "שיר 18",
    19: "שיר 19",
    20: "אימפריות נופלות לאט - דן תורן",
    21: "שיר 21",
    22: "שיר 22",
    23: "שיר 23",
    24: "שיר 24",
    25: "אני ואתה - אריק איינשטיין",
    26: "שיר 26",
    27: "שיר 27",
    28: "שיר 28",
    29: "שיר 29",
    30: "שיר 30",
    31: "שיר 31",
    32: "שיר 32",
    33: "שיר 33",
    34: "שיר 34",
    35: "שיר 35",
    36: "שיר 36",
    37: "שיר 37",
    38: "שיר 38",
    39: "שיר 39",
    40: "גן סגור - הכבש השישה עשר, גידי גוב",
    41: "שיר 41",
    42: "שיר 42",
    43: "שיר 43",
    44: "שיר 44",
    45: "שיר 45",
    46: "שיר 46",
    47: "שיר 47",
    48: "שיר 48",
    49: "שיר 49",
    50: "הולך נגד הרוח - שלום חנוך",
    # Continue for all 292 songs...
    # For now, let's add the ones we know and keep placeholders for the rest
}

# Fill in remaining songs with placeholders
for i in range(1, 293):
    if i not in all_song_titles:
        all_song_titles[i] = f"שיר {i}"

def update_all_titles():
    """Update all song titles"""
    with open("song-data.json", "r", encoding="utf-8") as f:
        data = json.load(f)
    
    songs = data.get("songs", [])
    updated = 0
    
    for song in songs:
        if "book-page-" in song["id"]:
            page_num = int(song["id"].split("-")[-1])
            if page_num in all_song_titles:
                old_title = song["title"]
                new_title = all_song_titles[page_num]
                if old_title != new_title:
                    song["title"] = new_title
                    updated += 1
    
    with open("song-data.json", "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print(f"✅ Updated {updated} song titles")
    print(f"📊 Total songs with real titles: {len([t for t in all_song_titles.values() if not t.startswith('שיר ')])}")

if __name__ == "__main__":
    update_all_titles()
