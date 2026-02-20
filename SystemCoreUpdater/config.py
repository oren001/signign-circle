import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# API Keys
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")

# Telegram Configuration
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID")

# Agent Configuration
UPDATE_INTERVAL_SEC = 3600  # Hourly
AGENT_VERSION = "1.1.0"
AGENT_NAME = "Noga's Computer Agent"
CHILD_AGE = 14
LOG_DIR = "logs"
