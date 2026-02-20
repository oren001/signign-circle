import requests
import config

class TelegramHandler:
    def __init__(self):
        self.token = config.TELEGRAM_BOT_TOKEN
        self.chat_id = config.TELEGRAM_CHAT_ID
        self.base_url = f"https://api.telegram.org/bot{self.token}/sendMessage"

    def send_message(self, text):
        """Sends a message to the configured Telegram chat."""
        try:
            payload = {
                "chat_id": self.chat_id,
                "text": text,
                "parse_mode": "Markdown"
            }
            response = requests.post(self.base_url, json=payload, timeout=10)
            if response.status_code == 200:
                return True
            else:
                print(f"Failed to send message: {response.status_code} - {response.text}")
                return False
        except Exception as e:
            print(f"Error sending Telegram message: {e}")
            return False
