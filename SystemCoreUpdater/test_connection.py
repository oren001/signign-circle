import config
from bot_handler import TelegramHandler

def test_connection():
    bot = TelegramHandler()
    print("Testing Telegram connection...")
    success = bot.send_message("🔍 *NogaAgent Connectivity Test*\nConnection successful!")
    if success:
        print("✅ Success! Check your Telegram.")
    else:
        print("❌ Failed to send message.")

if __name__ == "__main__":
    test_connection()
