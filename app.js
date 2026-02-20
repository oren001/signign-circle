// --- CRITICAL CACHE BUSTER ---
// If the user's browser has an old service worker caching index.html, it may load this file as a classic script.
// Top-level imports would throw a SyntaxError. We use dynamic imports instead.
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(function (registrations) {
        let hasUnregistered = false;
        for (let registration of registrations) {
            registration.unregister();
            hasUnregistered = true;
            console.log('Unregistered old ServiceWorker');
        }
        if (hasUnregistered && !window.location.href.includes('reloaded')) {
            window.location.href = window.location.href + (window.location.href.includes('?') ? '&' : '?') + 'reloaded=true';
        }
    });
}

const firebaseConfig = {
    apiKey: "AIzaSyDZPAln8_cWGZ54ElCce7_rGensf5P51Aw",
    authDomain: "singing-circle.firebaseapp.com",
    databaseURL: "https://singing-circle-default-rtdb.firebaseio.com",
    projectId: "singing-circle",
    storageBucket: "singing-circle.firebasestorage.app",
    messagingSenderId: "154350722932",
    appId: "1:154350722932:web:86eaabc6c734c755625621"
};

const USER_ID = localStorage.getItem('userId') || `user-${Date.now()}`;
localStorage.setItem('userId', USER_ID);

let db, ref, onValue, set, refs;

Promise.all([
    import("https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js"),
    import("https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js")
]).then(([firebaseApp, firebaseDb]) => {
    const app = firebaseApp.initializeApp(firebaseConfig);
    db = firebaseDb.getDatabase(app);
    ref = firebaseDb.ref;
    onValue = firebaseDb.onValue;
    set = firebaseDb.set;

    refs = {
        currentSong: ref(db, 'currentSongId')
    };

    initFirebaseListeners();
}).catch(err => {
    console.error("Firebase load error", err);
});

// State
let state = {
    isLeader: false,
    isFollowing: true,
    lastViewportData: null,
    currentSong: null,
    songs: [],
    viewport: {
        zoom: 1,
        x: 0,
        y: 0
    }
};

// DOM Elements
const els = {
    hamburgerBtn: document.getElementById('hamburgerBtn'),
    controlDrawer: document.getElementById('controlDrawer'),
    closeDrawerBtn: document.getElementById('closeDrawerBtn'),
    leaderBtn: document.getElementById('leaderBtn'),
    songImg: document.getElementById('currentSongImg'),
    songDisplay: document.getElementById('songDisplay'),
    viewerContainer: document.getElementById('viewerContainer'),
    songTitle: document.getElementById('currentSongTitle'),
    songSelector: document.getElementById('songSelector'),
    songList: document.getElementById('songListContainer'),
    searchInput: document.getElementById('searchInput'),
    openMenuBtn: document.getElementById('openMenuBtn'),
    closePanelBtn: document.getElementById('closePanelBtn'),
    followLeaderBtn: document.getElementById('followLeaderBtn'),
    followLeaderBtn: document.getElementById('followLeaderBtn')
};

// Refs
// (Moved inside dynamic import)

// --- OVERVIEW: SONG SYNC ONLY (v4.54.0) ---
// Viewport synchronization (zoom/pan) has been entirely removed. 
// Users can navigate freely natively. Only the current song selection is synchronized.

// Global Error Handler for better debugging on mobile
window.onerror = (msg, url, line) => {
    showToast(`❌ שגיאה: ${msg} (שורה ${line})`, '#e74c3c');
};

function showToast(text, bg = '#333') {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.style.background = bg;
    toast.innerText = text;
    document.getElementById('toastContainer').appendChild(toast);
    setTimeout(() => toast.remove(), 5000);
}

// --- FOLLOW LEADER / RESET VIEW ---

// This function now simply resets the user's manual zoom/pan back to (0,0) scale(1)
// It does NOT initiate ongoing coordinate synchronization anymore.
function resetViewToLeader() {
    if (state.isLeader) return;

    // Reset any arbitrary transforms and scroll position
    els.songDisplay.style.transform = `scale(1)`;
    els.songDisplay.style.transformOrigin = `0 0`;
    els.viewerContainer.scrollTo({ left: 0, top: 0, behavior: 'smooth' });

    // Hide the button after reset
    els.followLeaderBtn.classList.add('hidden');

    // We are now technically "Following" the leader's default view
    state.isFollowing = true;
    showToast('חזרת לתחילת השיר', '#27ae60');
}

// Show the "Follow Leader" button if user navigates away from default view
function checkBreakSync() {
    if (state.isLeader) return;
    if (state.isFollowing) {
        state.isFollowing = false;
        els.followLeaderBtn.classList.remove('hidden');
    }
}

// Wait until DOM is fully parsed to attach this specific button listener
if (els.followLeaderBtn) els.followLeaderBtn.addEventListener('click', resetViewToLeader);

// Trigger break sync if user scrolls at all
els.viewerContainer.addEventListener('scroll', checkBreakSync);

// Trigger break sync if user interacts (e.g., pinch zoom) via native visualViewport
if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', checkBreakSync);
    window.visualViewport.addEventListener('scroll', checkBreakSync);
}


// --- UI LOGIC ---

// Drawer Handling
els.hamburgerBtn.onclick = () => {
    els.controlDrawer.classList.remove('hidden');
    // Ensure viewport is locked while drawer is open
    document.body.style.overflow = 'hidden';
};

els.closeDrawerBtn.onclick = () => {
    els.controlDrawer.classList.add('hidden');
    document.body.style.overflow = '';
};

// ... (other drawer buttons same) ...

// Close drawer when clicking buttons inside
els.openMenuBtn.addEventListener('click', () => {
    els.controlDrawer.classList.add('hidden');
    els.songSelector.classList.remove('hidden');
});

// Toggle Leader
els.leaderBtn.addEventListener('click', () => {
    state.isLeader = !state.isLeader;
    els.leaderBtn.classList.toggle('active');
    els.leaderBtn.innerHTML = state.isLeader ? '🎤 מנחה פעיל' : '🎤 הפוך למנחה';

    if (state.isLeader) {
        state.isFollowing = true;
        els.followLeaderBtn.classList.add('hidden');
        showToast('🌟 אתה כעת המנחה!', '#8b5cf6');
    }
    els.controlDrawer.classList.add('hidden'); // Close drawer after selection
});

function initFirebaseListeners() {
    // Load Songs
    onValue(ref(db, 'songs'), (snap) => {
        const data = snap.val();
        if (data) {
            state.songs = Object.values(data);
            showToast(`✅ נטענו ${state.songs.length} שירים`, '#27ae60');
            renderSongList();

            // If we were waiting for songs to load a specific song
            if (state.pendingSongId) {
                loadSong(state.pendingSongId);
                state.pendingSongId = null;
            }
        } else {
            showToast('⚠️ לא נמצאו שירים במאגר', '#f39c12');
        }
    }, (err) => {
        showToast(`❌ שגיאת בסיס נתונים (שירים): ${err.message}`, '#e74c3c');
    });

    // Sync Current Song
    onValue(refs.currentSong, (snap) => {
        const id = snap.val();
        showToast(`🎵 שיר נוכחי: ${id || 'אין'}`, '#8e44ad');
        if (id) {
            if (state.songs.length > 0) {
                loadSong(id);
            } else {
                state.pendingSongId = id;
                els.songTitle.innerText = "מחכה לרשימת השירים...";
            }
        } else {
            els.songTitle.innerText = "בחרו שיר מהספריה";
        }
    }, (err) => {
        showToast(`❌ שגיאת בסיס נתונים (סנכרון): ${err.message}`, '#e74c3c');
    });
}


function loadSong(id) {
    const song = state.songs.find(s => s.id === id);
    if (!song) {
        state.pendingSongId = id;
        els.songTitle.innerText = "מחפש שיר...";
        return;
    }

    state.currentSong = song;
    els.songTitle.innerText = song.title;

    els.songImg.style.opacity = '0.5';

    const src = song.source.startsWith('http') ? song.source : `songs/${song.source.split('/').pop()}`;
    els.songImg.src = src;
    els.songImg.style.display = 'block';

    els.songImg.onload = () => {
        els.songImg.style.opacity = '1';
    };

    els.songImg.onerror = () => {
        showToast(`⚠️ שגיאה בטעינת תמונה: ${song.source.split('/').pop()}`, '#e67e22');
        els.songImg.style.opacity = '1';
    };

    state.viewport.zoom = 1;
    els.songDisplay.style.transform = 'scale(1)';
    els.viewerContainer.scrollTo(0, 0);
}

function renderSongList() {
    els.songList.innerHTML = state.songs.map(song => `
        <div class="song-item" onclick="selectSong('${song.id}')">
            <div class="song-title">${song.title}</div>
            <div class="song-item-arrow">←</div>
        </div>
    `).join('');
}

window.selectSong = (id) => {
    if (state.isLeader) {
        set(refs.currentSong, id);
    } else {
        loadSong(id); // Local preview
    }
    els.songSelector.classList.add('hidden');
};

// UI Handling
els.openMenuBtn.onclick = () => els.songSelector.classList.remove('hidden');
els.closePanelBtn.onclick = () => els.songSelector.classList.add('hidden');

els.searchInput.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    const items = els.songList.children;
    Array.from(items).forEach(item => {
        const text = item.innerText.toLowerCase();
        item.style.display = text.includes(q) ? 'block' : 'none';
    });
});

// --- UPDATE CHECKER ---
const CURRENT_VERSION = "4.54.1";
const VERSION_URL = "version.json";

function checkForUpdates() {
    fetch(VERSION_URL + '?t=' + Date.now()) // bust cache
        .then(r => r.json())
        .then(data => {
            if (data.version !== CURRENT_VERSION) {
                showUpdateNotification(data.version);
            }
        })
        .catch(() => { }); // silent fail
}

function showUpdateNotification(newVersion) {
    const existing = document.getElementById('update-toast');
    if (existing) return;

    const toast = document.createElement('div');
    toast.id = 'update-toast';
    toast.className = 'toast';
    toast.style.background = '#2ecc71'; // Green
    toast.style.cursor = 'pointer';
    toast.innerHTML = `🚀 גרסה חדשה (${newVersion}) זמינה! לחץ לרענון`;

    toast.onclick = () => window.location.reload();

    document.getElementById('toastContainer').appendChild(toast);
}

// Check every 30 seconds
setInterval(checkForUpdates, 30000);
// Check on load
checkForUpdates();
