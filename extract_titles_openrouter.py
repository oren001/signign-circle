
import os
import json
import time
import base64
import requests

# Configuration
OPENROUTER_API_KEY = "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" 
SONGS_DIR = "songs"
MAPPING_FILE = "song_mapping.json"
START_PAGE = 1
END_PAGE = 292
MODEL = "google/gemini-2.0-flash-001" 

def encode_image(image_path):
    with open(image_path, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode('utf-8')

def extract_content(api_key, image_path, page_num):
    try:
        base64_image = encode_image(image_path)
        
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        
        prompt = (
            "Analyze this song sheet image. Extract the following information in JSON format:\n"
            "1. 'title': The song title.\n"
            "2. 'artist': The performing artist (if mentioned).\n"
            "3. 'fullText': ALL readable text on the page, including lyrics and chords. Keep the original language (Hebrew/English).\n\n"
            "Return ONLY the JSON object."
        )
        
        payload = {
            "model": MODEL,
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/png;base64,{base64_image}"
                            }
                        }
                    ]
                }
            ],
            "response_format": { "type": "json_object" }
        }
        
        response = requests.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers=headers,
            data=json.dumps(payload),
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            if 'choices' in result:
                content = result['choices'][0]['message']['content'].strip()
                # Clean up markdown code blocks if present
                if content.startswith('```json'):
                    content = content[7:-3].strip()
                elif content.startswith('```'):
                    content = content[3:-3].strip()
                
                # Use strict=False to handle potential escape character issues
                return json.loads(content, strict=False)
        else:
            print(f"API Error on page {page_num}: {result}")
            return None
            
    except Exception as e:
        print(f"Error on page {page_num}: {e}")
        return None

def main():
    if OPENROUTER_API_KEY == "YOUR_API_KEY_HERE" or not OPENROUTER_API_KEY:
        print("Please provide a valid OpenRouter API Key.")
        return

    # Load existing mapping if available to resume
    results = {}
    if os.path.exists(MAPPING_FILE):
        try:
            with open(MAPPING_FILE, 'r', encoding='utf-8') as f:
                results = json.load(f)
        except:
            pass

    for i in range(START_PAGE, END_PAGE + 1):
        page_key = str(i)
        existing = results.get(page_key)
        
        # Robust check for skip
        if existing:
            if isinstance(existing, list) and len(existing) > 0:
                existing = existing[0]
            
            if isinstance(existing, dict) and existing.get('fullText'):
                print(f"Skipping Page {i} (already extracted with text)")
                continue
            
        image_path = os.path.join(SONGS_DIR, f"page_{i:03d}.png")
        if not os.path.exists(image_path):
            print(f"File not found: {image_path}")
            continue
            
        print(f"Processing Page {i} (Full Text Extraction)...")
        data = extract_content(OPENROUTER_API_KEY, image_path, i)
        
        if data:
            # Handle cases where AI returns a list of results or other formats
            if isinstance(data, list) and len(data) > 0:
                data = data[0]
            
            if not isinstance(data, dict):
                print(f"  Invalid format for page {i}: {type(data)}")
                continue

            results[page_key] = data
            # Save progress every time
            with open(MAPPING_FILE, 'w', encoding='utf-8') as f:
                json.dump(results, f, ensure_ascii=False, indent=2)
            print(f"  Result: {data.get('title')} / {data.get('artist')}")
        else:
            print(f"  Failed.")
        
        # OpenRouter rate limits vary
        time.sleep(2) 

    print("Full text extraction complete.")

if __name__ == "__main__":
    main()
