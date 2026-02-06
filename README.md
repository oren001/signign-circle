# 🎵 Singing Circle - Synchronized Song Viewer (Version 2)

**Version 2 Development Branch** - This is the development version with new features and improvements.

## Features

- **Real-time Synchronization** - Everyone sees the same song instantly
- **Collaborative Voting** - Vote on your favorite songs
- **Flexible Song Sources** - Support for uploaded images and external URLs
- **Leader Controls** - Simple PIN-based leader mode
- **Mobile Optimized** - Works on phones, tablets, and computers
- **No Login Required** - Just share one URL with your group

## Quick Start

### 1. Set Up Firebase

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project (or use existing)
3. Click "Add app" → Web app (</>) icon
4. Register your app with a nickname (e.g., "Singing Circle")
5. Copy the Firebase configuration values
6. Open `firebase-config.js` and replace the placeholder values:
   ```javascript
   const firebaseConfig = {
     apiKey: "YOUR_API_KEY_HERE",
     authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
     databaseURL: "https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com",
     projectId: "YOUR_PROJECT_ID",
     storageBucket: "YOUR_PROJECT_ID.appspot.com",
     messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
     appId: "YOUR_APP_ID"
   };
   ```

7. In Firebase Console, go to "Realtime Database" and click "Create Database"
8. Choose "Start in test mode" (you can secure it later)
9. Click "Enable"

### 2. Add Your Song Images

1. Replace the placeholder files in the `songs/` folder with your actual song sheets
2. Supported formats: JPG, PNG, PDF
3. Name them `song1.jpg`, `song2.jpg`, etc.
4. Update `song-data.json` with the correct song titles:
   ```json
   {
     "songs": [
       {
         "id": "song-1",
         "title": "Your Song Title Here",
         "type": "image",
         "source": "songs/song1.jpg",
         "votes": 0,
         "addedBy": "system"
       }
     ]
   }
   ```

### 3. Set Your Leader PIN

1. Open `firebase-config.js`
2. Change the `LEADER_PIN` value to your preferred 4-digit code:
   ```javascript
   const LEADER_PIN = '1234'; // Change this!
   ```

### 4. Test Locally

1. Open `index.html` in a web browser
2. Open the same file in multiple browser windows to test sync
3. Enter the leader PIN in one window to become the leader
4. Navigate songs and verify all windows sync

### 5. Deploy to Netlify

#### Option A: Drag & Drop (Easiest)
1. Go to [Netlify](https://www.netlify.com/)
2. Sign up for a free account
3. Drag and drop the entire project folder onto the Netlify dashboard
4. Your site will be live in seconds!

#### Option B: Git Deploy (Recommended)
1. Initialize a Git repository:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   ```
2. Push to GitHub (create a new repository first)
3. Connect your GitHub repo to Netlify
4. Netlify will auto-deploy on every push

## How to Use

### For Participants

1. **Open the shared URL** - Just click the link shared by your singing circle leader
2. **Browse songs** - See all available songs in the sidebar
3. **Vote for favorites** - Click the "♡ Vote" button on songs you want to sing
4. **Auto-sync** - Your view automatically follows the leader's selection
5. **Zoom/scroll** - You can zoom and scroll independently on your device

### For Leaders

1. **Become leader** - Click "Become Leader" and enter the 4-digit PIN
2. **Navigate songs** - Use the Previous/Next buttons or click any song
3. **Add new songs** - Paste a URL (e.g., Ultimate Guitar link) or search for a song
4. **See vote counts** - Check which songs are most popular
5. **Sort by votes** - Enable "Sort by votes" to see top-voted songs first

## Adding Songs

### Via URL (Leader Only)

1. Find a song on Ultimate Guitar, Chordify, or any chord website
2. Copy the URL
3. Paste it into the "Add Song" field
4. Click "Add"
5. The song will appear in the list and sync to all devices

### Via Search (Leader Only)

1. Type a song name in the "Add Song" field (without http://)
2. Click "Add"
3. The app will search Ultimate Guitar and add the results

### Via Image Upload

1. Add your image files to the `songs/` folder
2. Update `song-data.json` with the new song details
3. Redeploy the site (or refresh if testing locally)

## Customization

### Change the Leader PIN

Edit `firebase-config.js`:
```javascript
const LEADER_PIN = 'YOUR_NEW_PIN';
```

### Change Session ID (for multiple groups)

Edit `firebase-config.js`:
```javascript
const SESSION_ID = 'your-group-name';
```

This allows you to run multiple independent singing circles on the same app.

### Customize Colors

Edit `styles.css` and change the CSS variables at the top:
```css
:root {
    --primary-color: #6366f1;
    --secondary-color: #ec4899;
    /* ... more colors ... */
}
```

## Troubleshooting

### "Connection error" or "Disconnected"

- Check your Firebase configuration in `firebase-config.js`
- Ensure Firebase Realtime Database is enabled
- Check your internet connection

### Songs not syncing

- Verify all devices are using the same URL
- Check that Firebase is connected (green dot in header)
- Try refreshing the page

### Can't become leader

- Double-check the PIN you entered
- Verify the `LEADER_PIN` in `firebase-config.js`
- The PIN is case-sensitive

### Images not loading

- Verify image files exist in the `songs/` folder
- Check that `song-data.json` has the correct file paths
- Ensure image formats are supported (JPG, PNG, PDF)

### External URLs not displaying

- Some websites block embedding in iframes
- Try a different chord website (Ultimate Guitar usually works)
- Check browser console for errors

## Firebase Free Tier Limits

- **100 simultaneous connections** - Perfect for singing circles
- **1 GB data storage** - Plenty for song lists
- **10 GB/month data transfer** - More than enough for typical use
- **No credit card required**

## Security Notes

- The app is completely public (no authentication)
- Anyone with the URL can view and vote
- Only people with the PIN can become leader
- Consider changing the PIN regularly
- For production use, set up Firebase security rules

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review Firebase Console for errors
3. Check browser console (F12) for JavaScript errors

## License

Free to use for personal and community singing circles!

---

**Enjoy your singing circle! 🎶**
