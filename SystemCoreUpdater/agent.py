import time
import os
import sys
import io
import base64
import requests
from datetime import datetime
from pathlib import Path
from io import BytesIO

# Third-party imports
try:
    from PIL import Image, ImageGrab
    from pynput import mouse, keyboard
    DEP_OK = True
except ImportError as e:
    DEP_OK = False
    DEP_ERROR = str(e)

import config
from bot_handler import TelegramHandler

# Set up file-based logging
LOG_FILE = Path(__file__).parent / "agent_log.txt"

def log(msg):
    try:
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        with open(LOG_FILE, 'a', encoding='utf-8') as f:
            f.write(f"[{timestamp}] {msg}\n")
    except Exception:
        pass

class ActivityMonitor:
    def __init__(self):
        self.mouse_moves = 0
        self.key_presses = 0
        self.last_activity_time = datetime.now()
        self.has_activity_in_window = False

    def reset(self):
        self.mouse_moves = 0
        self.key_presses = 0
        self.has_activity_in_window = False

    def get_total_activity(self):
        return self.mouse_moves + self.key_presses

    def on_mouse_move(self, x, y):
        self.mouse_moves += 1
        self.last_activity_time = datetime.now()
        self.has_activity_in_window = True

    def on_key_press(self, key):
        self.key_presses += 1
        self.last_activity_time = datetime.now()
        self.has_activity_in_window = True

def take_screenshot():
    """Captures a screenshot and returns it as a PIL Image."""
    try:
        return ImageGrab.grab()
    except Exception as e:
        log(f"Error taking screenshot: {e}")
        return None

def get_ai_analysis(screenshot):
    """Sends screenshot to OpenRouter (Claude) for safety and activity analysis."""
    if not config.OPENROUTER_API_KEY:
        return "AI Analysis unavailable (API Key missing)"

    try:
        # Convert screenshot to base64
        buffered = BytesIO()
        screenshot.save(buffered, format="PNG")
        img_str = base64.b64encode(buffered.getvalue()).decode()
        
        url = "https://openrouter.ai/api/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {config.OPENROUTER_API_KEY}",
            "Content-Type": "application/json"
        }
        
        prompt = f"""You are a child safety filter for a {config.CHILD_AGE}-year-old child.
Analyze this screen content and classify it as SAFE, CONCERNING, or HIGH_RISK.

Provide a brief, one-sentence summary of the activity.
Output format: [CLASSIFICATION]: [Activity Summary]
"""

        payload = {
            "model": "anthropic/claude-3-haiku",
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
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

        response = requests.post(url, headers=headers, json=payload, timeout=30)
        if response.status_code == 200:
            return response.json()['choices'][0]['message']['content'].strip()
        else:
            log(f"OpenRouter error {response.status_code}: {response.text}")
            return f"AI Analysis failed (Status {response.status_code})"
    except Exception as e:
        log(f"AI Analysis exception: {e}")
        return f"AI Analysis failed: {str(e)}"

def run_agent():
    log("Agent starting up...")
    bot = TelegramHandler()
    
    if not DEP_OK:
        log(f"FATAL: Missing dependencies: {DEP_ERROR}")
        bot.send_message(f"⚠️ *{config.AGENT_NAME}* failed to start: Missing dependencies ({DEP_ERROR})")
        return

    activity = ActivityMonitor()
    
    # Start listeners
    mouse_listener = mouse.Listener(on_move=activity.on_move if hasattr(activity, 'on_move') else activity.on_mouse_move)
    keyboard_listener = keyboard.Listener(on_press=activity.on_press if hasattr(activity, 'on_press') else activity.on_key_press)
    mouse_listener.start()
    keyboard_listener.start()
    log("Listeners started.")

    bot.send_message(f"🚀 *{config.AGENT_NAME}* v{config.AGENT_VERSION} is now online with OpenRouter AI monitoring!")

    try:
        while True:
            log(f"Waiting {config.UPDATE_INTERVAL_SEC}s for next check...")
            time.sleep(config.UPDATE_INTERVAL_SEC)
            
            current_time = datetime.now().strftime('%H:%M:%S')
            total_activity = activity.get_total_activity()
            
            analysis_result = "💤 No activity detected this hour."
            status = "💤 *Idle*"
            
            if activity.has_activity_in_window:
                status = "🟢 *Active*"
                log("Activity detected. Taking screenshot for AI analysis...")
                ss = take_screenshot()
                if ss:
                    analysis_result = get_ai_analysis(ss)
                else:
                    analysis_result = "⚠️ Failed to capture screenshot for analysis."
            
            last_active = activity.last_activity_time.strftime('%H:%M:%S')
            
            report = (
                f"⏰ *Hourly Update*\n\n"
                f"Status: {status}\n"
                f"Time: {current_time}\n"
                f"Last Active: {last_active}\n"
                f"Activity Count: {total_activity}\n\n"
                f"🔍 *AI Analysis*:\n{analysis_result}"
            )
            
            bot.send_message(report)
            log(f"Report sent for {current_time}. Status: {status}")
            
            activity.reset()
            
    except Exception as e:
        log(f"Error in run loop: {e}")
        raise
    finally:
        mouse_listener.stop()
        keyboard_listener.stop()

def main():
    log("="*40)
    log(f"{config.AGENT_NAME} starting...")
    while True:
        try:
            run_agent()
        except KeyboardInterrupt:
            break
        except Exception as e:
            log(f"Restarting after error: {e}")
            time.sleep(30)

if __name__ == "__main__":
    main()
