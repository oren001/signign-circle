import json

# Manual title updates for popular songs
manual_titles = {
    3: "Hey Jude / The Beatles",
    10: "You've got a friend / James Taylor",
    11: "More Than Words / Extreme",
    13: "אביא לך - אהוד בנאי",
    14: "אגדת דשא - אריק איינשטיין",
    15: "אדם בתוך עצמו - שלום חנוך",
    16: "אהבה קצרת - מאיר בנאי וארקדי דוכין",
    17: "אהובתי - משינה",
    18: "אולי - אביב גפן",
    19: "אחד אלוהים - איפה הילד",
    20: "אימפריות נופלות לאט - דן תורן",
    21: "אל תפחד - אהוד בנאי",
    22: "אם כבר לבד - החברים של נטאשה",
    23: "אנה - משינה",
    24: "אנחנו שנינו - משינה",
    25: "אני ואתה - אריק איינשטיין",
    26: "אשליות - ניסים סרוסי",
    27: "את מביאה הכל - שלום חנוך",
    28: "אתה פה חסר לי - נורית גלרון",
    29: "אתם זוכרים את השירים - חנן יובל",
    31: "בגללך - אריק איינשטיין",
    32: "בדרך אל הים - משינה",
    33: "בואי - הפרויקט של עידן רייכל",
    40: "גן סגור - הכבש השישה עשר, גידי גוב",
    50: "הולך נגד הרוח - שלום חנוך",
    60: "זו נדירך - קורין אלאל",
    70: "יוצא לאור - אהוד בנאי",
    80: "יש לך אותי - תיכלם",
    90: "כשאת בוכה את לא יפה - תיכלם",
    100: "לא תפסו אותי - מאיר אריאל",
    110: "לילות לבנים - אביב גפן",
    120: "מה שעובר עלי - איפה הילד",
    150: "ניצחת איתי הכל - עמיר בניון",
    200: "ענבל - אסטרף",
}

def update_manual_titles():
    """Update specific song titles manually"""
    with open("song-data.json", "r", encoding="utf-8") as f:
        data = json.load(f)
    
    songs = data.get("songs", [])
    updated = 0
    
    for song in songs:
        if "book-page-" in song["id"]:
            page_num = int(song["id"].split("-")[-1])
            if page_num in manual_titles:
                song["title"] = manual_titles[page_num]
                updated += 1
                print(f"✓ Updated page {page_num}: {manual_titles[page_num]}")
    
    with open("song-data.json", "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print(f"\n✅ Updated {updated} song titles manually")

if __name__ == "__main__":
    update_manual_titles()
