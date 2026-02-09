import requests
import json

def add_extra_songs():
    # Firebase URL
    firebase_url = "https://singing-circle-default-rtdb.firebaseio.com/songs"
    
    # Extra songs to add
    extra_songs = {
        "song-amdursky-15min": {
            "title": "15 דקות - אסף אמדורסקי",
            "type": "url",
            "source": "https://www.tab4u.com/tabs/songs/8_%D7%90%D7%A1%D7%A3_%D7%90%D7%9E%D7%93%D7%95%D7%A8%D7%A1%D7%A7%D7%99_-_15_%D7%93%D7%A7%D7%95%D7%AA.html",
            "votes": 0,
            "addedBy": "system",
            "fullText": "אסף אמדורסקי 15 דקות אקורדים מילים יניב הורביץ"
        },
        "song-amdursky-heaven": {
            "title": "השמים הכחולים - אסף אמדורסקי",
            "type": "url",
            "source": "https://www.tab4u.com/tabs/songs/47_%D7%90%D7%A1%D7%A3_%D7%90%D7%9E%D7%93%D7%95%D7%A8%D7%A1%D7%A7%D7%99_-_%D7%94%D7%A9%D7%9E%D7%99%D7%9D_%D7%94%D7%9B%D7%97%D7%95%D7%9C%D7%99%D7%9D.html",
            "votes": 0,
            "addedBy": "system",
            "fullText": "השמים הכחולים אסף אמדורסקי אקורדים מילים"
        },
        "song-amdursky-dear": {
            "title": "יקירתי - אסף אמדורסקי",
            "type": "url",
            "source": "https://www.tab4u.com/tabs/songs/39_%D7%90%D7%A1%D7%A3_%D7%90%D7%9E%D7%93%D7%95%D7%A8%D7%A1%D7%A7%D7%99_-_%D7%99%D7%A7%D7%99%D7%A8%D7%AA%D7%99.html",
            "votes": 0,
            "addedBy": "system",
            "fullText": "יקירתי אסף אמדורסקי אקורדים מילים לטי גרובמן"
        }
    }
    
    print(f"Adding {len(extra_songs)} extra songs to Firebase...")
    
    # Push each song (using .patch to merge without deleting others)
    response = requests.patch(f"{firebase_url}.json", data=json.dumps(extra_songs))
    
    if response.status_code == 200:
        print("Successfully added extra songs!")
    else:
        print(f"Failed to add songs. Status: {response.status_code}")
        print(response.text)

if __name__ == "__main__":
    add_extra_songs()
