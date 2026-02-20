import os
import base64
import requests
from io import BytesIO
from dotenv import load_dotenv
from PIL import ImageGrab

def test_ai():
    print("🚀 Starting OpenRouter Connectivity Test...")
    
    # Load .env
    load_dotenv()
    api_key = os.getenv("OPENROUTER_API_KEY")
    
    if not api_key:
        print("❌ Error: OPENROUTER_API_KEY not found in .env file.")
        return

    print(f"🔑 API Key found (starts with: {api_key[:10]}...)")

    try:
        # 1. Take Screenshot
        print("📸 Capturing screenshot...")
        screenshot = ImageGrab.grab()
        buffered = BytesIO()
        screenshot.save(buffered, format="PNG")
        img_str = base64.b64encode(buffered.getvalue()).decode()
        print("✅ Screenshot captured.")

        # 2. Call OpenRouter
        print("🤖 Sending to OpenRouter (Claude 3 Haiku) for analysis...")
        
        url = "https://openrouter.ai/api/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://github.com/google-deepmind/antigravity", # Optional
            "X-Title": "NogaAgent" # Optional
        }
        
        prompt = """Analyze this screen content. 
Classify it as SAFE, CONCERNING, or HIGH_RISK for a 14-year-old child.
Provide a brief, one-sentence summary of what is visible.
Output format: [CLASSIFICATION]: [Summary]"""

        payload = {
            "model": "anthropic/claude-3-haiku",
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": prompt
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/png;base64,{img_str}"
                            }
                        }
                    ]
                }
            ]
        }

        response = requests.post(url, headers=headers, json=payload)
        
        if response.status_code == 200:
            result = response.json()['choices'][0]['message']['content'].strip()
            print(f"\n✨ AI Analysis Result:\n{result}")
            print("\n✅ Test completed successfully!")
        else:
            print(f"\n❌ Test failed with status code {response.status_code}")
            print(f"Response: {response.text}")

    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")

if __name__ == "__main__":
    test_ai()
