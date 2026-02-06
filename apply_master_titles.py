
import json
import os

# Titles from NotebookLM (User provided)
user_provided_mapping = [
  {"page": 1, "title": "N/A (Cover Page / Intro)"},
  {"page": 2, "title": "Hey Jude"},
  {"page": 3, "title": "The Long and Winding Road"},
  {"page": 4, "title": "Yesterday"},
  {"page": 5, "title": "Can’t Help Falling In Love"},
  {"page": 6, "title": "Knockin on Heavens Doors"},
  {"page": 7, "title": "Nothing Else Matters"},
  {"page": 8, "title": "I Talk to the Wind"},
  {"page": 9, "title": "You’ve got a friend"},
  {"page": 10, "title": "More Than Words"},
  {"page": 11, "title": "N/A (Hebrew Songs Section Divider)"},
  {"page": 12, "title": "אביא לך"},
  {"page": 13, "title": "אגדת דשא"},
  {"page": 14, "title": "אדם בתוך עצמו"},
  {"page": 15, "title": "אהבה קצרה"},
  {"page": 16, "title": "אהובתי"},
  {"page": 17, "title": "אולי"},
  {"page": 18, "title": "אחד אלוהים"},
  {"page": 19, "title": "אימפריות נופלות לאט"},
  {"page": 20, "title": "אל תפחד"},
  {"page": 21, "title": "אם כבר לבד"},
  {"page": 22, "title": "אנה"},
  {"page": 23, "title": "אנחנו שניים"},
  {"page": 24, "title": "אני ואתה"},
  {"page": 25, "title": "אשליות"},
  {"page": 26, "title": "את מביאה הכל"},
  {"page": 27, "title": "אתה פה חסר לי"},
  {"page": 28, "title": "אתם זוכרים את השירים"},
  {"page": 29, "title": "בגללך"},
  {"page": 30, "title": "בדרך אל הים"},
  {"page": 31, "title": "בואי"},
  {"page": 32, "title": "בך לא נוגע"},
  {"page": 33, "title": "במרחק נגיעה מכאן"},
  {"page": 34, "title": "בצהרי היום"},
  {"page": 35, "title": "ברחובות שלנו"},
  {"page": 36, "title": "גאולה"},
  {"page": 37, "title": "גיטרה וכינור"},
  {"page": 38, "title": "גן סגור"},
  {"page": 39, "title": "גשם (בנזין)"},
  {"page": 40, "title": "גשם (מאיר בנאי)"},
  {"page": 41, "title": "דוד ושאול"},
  {"page": 42, "title": "דמיון חופשי"},
  {"page": 43, "title": "דרך ארוכה"},
  {"page": 44, "title": "דרכנו"},
  {"page": 45, "title": "האהבה הראשונה"},
  {"page": 46, "title": "האיש שראה הכל"},
  {"page": 47, "title": "הולך בטל"},
  {"page": 48, "title": "הולך נגד הרוח"},
  {"page": 49, "title": "החדר האינטימי שלי"},
  {"page": 50, "title": "היא לא דומה"},
  {"page": 51, "title": "הכוכבים דולקים על אש קטנה"},
  {"page": 52, "title": "הפרח בגני"},
  {"page": 53, "title": "הקיץ האחרון"},
  {"page": 54, "title": "ואיך שלא"},
  {"page": 55, "title": "זה מכבר"},
  {"page": 56, "title": "זה קורה"},
  {"page": 57, "title": "זמר נוגה"},
  {"page": 58, "title": "זן נדיר"},
  {"page": 59, "title": "שישי שבת"},
  {"page": 60, "title": "שלח לי מלאך"},
  {"page": 61, "title": "שלכת"},
  {"page": 62, "title": "שלל שרב"},
  {"page": 63, "title": "שמש"},
  {"page": 64, "title": "שמש שמש"},
  {"page": 65, "title": "שמת לי פודרה"},
  {"page": 66, "title": "שנינו שווים"},
  {"page": 67, "title": "שער הרחמים"},
  {"page": 68, "title": "שתי אצבעות מצידון"},
  {"page": 69, "title": "תגידי"},
  {"page": 70, "title": "תותים"},
  {"page": 71, "title": "תחזור תחזור"},
  {"page": 72, "title": "תלבשי לבן"},
  {"page": 73, "title": "תמונה אימפרסיוניסטית"},
  {"page": 74, "title": "תמיד יחכו לך"},
  {"page": 75, "title": "תן לשים ת'ראש על דיונה"},
  {"page": 76, "title": "תפוחים ותמרים"},
  {"page": 77, "title": "תרקוד"},
  {"page": 78, "title": "תשאירי לי מקום לחבק אותך"},
  {"page": 79, "title": "N/A (Chord Charts & Art)"}
]

QUIET_SONGS = {
    "אדם בתוך עצמו", "אולי", "Yesterday", "Hey Jude", "Yesterday", "The Long and Winding Road",
    "זמר נוגה", "אהבה קצרה", "גיטרה וכינור", "דרכנו", "הולך נגד הרוח"
}

def update_titles():
    # Load current data
    with open("song-data.json", "r", encoding="utf-8") as f:
        data = json.load(f)
    
    songs = data.get("songs", [])
    
    # Create mapping dictionary for faster lookup (UserPage + 1 = MyPage)
    mapping_dict = {item["page"] + 1: item["title"] for item in user_provided_mapping}
    
    updated_count = 0
    for song in songs:
        if "book-page-" in song["id"]:
            my_page_num = int(song["id"].split("-")[-1])
            
            # Apply user titles
            if my_page_num in mapping_dict:
                song["title"] = mapping_dict[my_page_num]
                updated_count += 1
            else:
                # Page 81+ or unidentified
                if my_page_num > 80:
                    song["title"] = f"נספח אקורדים {my_page_num}"
                    updated_count += 1
            
            # Tag quiet songs
            if song["title"] in QUIET_SONGS:
                song["isQuiet"] = True
    
    # Save back
    with open("song-data.json", "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print(f"✅ Updated {updated_count} titles and tagged quiet songs.")

if __name__ == "__main__":
    update_titles()
