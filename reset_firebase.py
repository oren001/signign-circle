import requests
import json

db_url = "https://singing-circle-default-rtdb.firebaseio.com/sessions/v2.json"


def reset():
    # Fetch songs from song-data.json
    with open("song-data.json", "r", encoding="utf-8") as f:
        data = json.load(f)
    
    songs_obj = {s["id"]: s for s in data["songs"]}
    
    update_data = {
        "songs": songs_obj,
        "currentSong": "book-page-1"
    }

    
    print("Updating Firebase...")
    r = requests.put(db_url, json=update_data)
    if r.status_code == 200:
        print("Successfully reset Firebase session.")
    else:
        print(f"Failed to reset Firebase: {r.status_code}")
        print(r.text)

if __name__ == "__main__":
    reset()
