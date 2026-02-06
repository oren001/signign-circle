# 🚀 Quick Setup Guide

## Step 1: Firebase Setup (5 minutes)

1. **Create Firebase Project:**
   - Go to: https://console.firebase.google.com/
   - Click "Add project"
   - Name: "Singing Circle" (or your choice)
   - Disable Google Analytics (optional)
   - Click "Create project"

2. **Enable Realtime Database:**
   - In left menu, click "Realtime Database"
   - Click "Create Database"
   - Choose your location
   - Start in **test mode**
   - Click "Enable"

3. **Get Your Config:**
   - Click gear icon → "Project settings"
   - Scroll to "Your apps"
   - Click `</>` (Web icon)
   - Register app: "Singing Circle Web"
   - Copy the `firebaseConfig` object

4. **Update firebase-config.js:**
   - Open: `firebase-config.js`
   - Replace the placeholder values with your config
   - Save the file

## Step 2: Customize

1. **Change Leader PIN:**
   - Open: `firebase-config.js`
   - Change: `const LEADER_PIN = '1234';` to your PIN
   - Save

2. **Add Your Songs:**
   - Replace files in `songs/` folder with your images
   - Update `song-data.json` with correct titles
   - Save

## Step 3: Test Locally

**Option A - Python:**
```bash
cd "c:\Users\oren weiss\.gemini\antigravity\playground\vast-astro"
python -m http.server 8000
```
Open: http://localhost:8000

**Option B - Batch File:**
- Double-click: `start-server.bat`
- Open: http://localhost:8000

**Test:**
1. Open in 2+ browser windows
2. Enter PIN in one window
3. Navigate songs
4. Verify sync works

## Step 4: Deploy to Netlify

**Easiest Method:**
1. Go to: https://www.netlify.com/
2. Sign up (free)
3. Drag the entire `vast-astro` folder onto dashboard
4. Done! Copy your public URL

**Share with your singing circle:**
- URL: `https://your-site.netlify.app`
- Leader PIN: `[your PIN]`

## Troubleshooting

**"Connection error"**
- Check Firebase config in `firebase-config.js`
- Ensure Realtime Database is enabled

**"Songs not loading"**
- Check file paths in `song-data.json`
- Verify images exist in `songs/` folder

**"Can't become leader"**
- Verify PIN in `firebase-config.js`
- PIN is case-sensitive

## Need More Help?

See: `README.md` for detailed documentation

---

**That's it! You're ready to sing! 🎵**
