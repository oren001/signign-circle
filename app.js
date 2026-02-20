import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, onValue, set } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyDZPAln8_cWGZ54ElCce7_rGensf5P51Aw",
    authDomain: "singing-circle.firebaseapp.com",
    databaseURL: "https://singing-circle-default-rtdb.firebaseio.com",
    projectId: "singing-circle",
    storageBucket: "singing-circle.firebasestorage.app",
    messagingSenderId: "154350722932",
    appId: "1:154350722932:web:86eaabc6c734c755625621"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const USER_ID = localStorage.getItem('userId') || `user-${Date.now()}`;
localStorage.setItem('userId', USER_ID);

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
const refs = {
    currentSong: ref(db, 'currentSongId'),
    viewport: ref(db, 'viewport')
};

// --- SYNC ENGINE (Focal-Point & Percentage Based v3.3) ---

let lastBroadcast = 0;
let isSyncing = false;
let NATURAL_WIDTH = null;
let NATURAL_HEIGHT = null;

// Initialize natural dimensions when an image loads
function initializeNaturalDimensions() {
    NATURAL_WIDTH = els.songDisplay.offsetWidth;
    NATURAL_HEIGHT = els.songDisplay.offsetHeight;
}

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

// Helper: Get center offset percentage
function getScrollPercentages() {
    const container = els.viewerContainer;
    const centerX = container.scrollLeft + (container.clientWidth / 2);
    const centerY = container.scrollTop + (container.clientHeight / 2);
    const zoom = state.viewport.zoom;
    const relX = centerX / (NATURAL_WIDTH * zoom);
    const relY = centerY / (NATURAL_HEIGHT * zoom);
    return { relX, relY };
}

// BROADCAST (Leader)
const broadcastViewport = () => {
    if (!state.isLeader || !NATURAL_WIDTH) return;

    const now = Date.now();
    if (now - lastBroadcast < 33) return; // ~30fps for smoother sync

    const { relX, relY } = getScrollPercentages();

    set(refs.viewport, {
        zoom: state.viewport.zoom,
        relX,
        relY,
        timestamp: now,
        userId: USER_ID
    });

    lastBroadcast = now;
};

// APPLY (Follower)
const applyViewport = (data, force = false) => {
    state.lastViewportData = data;
    if (state.isLeader || data.userId === USER_ID || !NATURAL_WIDTH) return;
    if (!state.isFollowing && !force) return;

    isSyncing = true;

    // 1. Apply Zoom Transform
    els.songDisplay.style.transform = `scale(${data.zoom})`;
    state.viewport.zoom = data.zoom; // keep state in sync

    // 2. Apply Scroll (Target Center)
    requestAnimationFrame(() => {
        const container = els.viewerContainer;
        const targetCenterX = data.relX * NATURAL_WIDTH * data.zoom;
        const targetCenterY = data.relY * NATURAL_HEIGHT * data.zoom;

        container.scrollTo({
            left: targetCenterX - (container.clientWidth / 2),
            top: targetCenterY - (container.clientHeight / 2),
            behavior: 'auto'
        });

        isSyncing = false;
    });
};

// --- SYNC STATE MANAGEMENT & FOLLOW BUTTON ---

function breakSync() {
    if (state.isLeader || !state.isFollowing) return;
    state.isFollowing = false;
    els.followLeaderBtn.classList.remove('hidden');
    showToast('הפסקת לעקוב. מנווט עצמאית.', '#f39c12');
}

function resumeSync() {
    if (state.isLeader) return;
    state.isFollowing = true;
    els.followLeaderBtn.classList.add('hidden');
    if (state.lastViewportData) {
        applyViewport(state.lastViewportData, true);
    }
    showToast('חזרת לעקוב אחרי המנחה', '#27ae60');
}

// Attach listener dynamically since els.followLeaderBtn might be null during initialization before HTML is updated
if (els.followLeaderBtn) els.followLeaderBtn.addEventListener('click', resumeSync);

// --- TOUCH HANDLING (Universal Navigation + Focal-Point Zoom) ---

let initialDist = null;
let initialZoom = 1;
let lastTapTime = 0;

function getDistance(touches) {
    return Math.hypot(
        touches[0].clientX - touches[1].clientX,
        touches[0].clientY - touches[1].clientY
    );
}

els.songDisplay.addEventListener('touchstart', (e) => {
    // If follower touches the screen, break sync immediately
    if (!state.isLeader && e.touches.length > 0) {
        breakSync();
    }

    if (e.touches.length === 2) {
        initialDist = getDistance(e.touches);
        initialZoom = state.viewport.zoom;
        e.preventDefault(); // Stop native Pinch-to-zoom for everyone (we handle it)
    }

    // Double Tap Zoom
    if (e.touches.length === 1) {
        const currentTime = Date.now();
        const tapDelay = currentTime - lastTapTime;
        if (tapDelay < 300 && tapDelay > 0) {
            const newZoom = state.viewport.zoom === 1 ? 2.5 : 1;
            els.songDisplay.style.transform = `scale(${newZoom})`;
            state.viewport.zoom = newZoom;
            if (state.isLeader) broadcastViewport();
            e.preventDefault(); // Stop native double-tap zoom
        }
        lastTapTime = currentTime;
    }
}, { passive: false });

els.songDisplay.addEventListener('touchmove', (e) => {
    if (!state.isLeader) breakSync();

    if (e.touches.length === 2 && initialDist) {
        e.preventDefault(); // Take control of zoom

        const dist = getDistance(e.touches);
        const scale = dist / initialDist;
        const newZoom = Math.min(Math.max(0.5, initialZoom * scale), 4);

        els.songDisplay.style.transformOrigin = '0 0';
        els.songDisplay.style.transform = `scale(${newZoom})`;
        state.viewport.zoom = newZoom;

        if (state.isLeader) broadcastViewport();
    }
}, { passive: false });

els.songDisplay.addEventListener('touchend', (e) => {
    if (e.touches.length < 2) {
        initialDist = null;
    }
});

// Broadcast/Break scroll events
els.viewerContainer.addEventListener('scroll', () => {
    if (!state.isLeader && !isSyncing) {
        breakSync();
    }
    if (state.isLeader && !isSyncing) {
        broadcastViewport();
    }
});


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
        broadcastViewport();
        showToast('🌟 אתה כעת המנחה!', '#8b5cf6');
    }
    els.controlDrawer.classList.add('hidden'); // Close drawer after selection
});

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

// Sync Viewport
onValue(refs.viewport, (snap) => {
    const data = snap.val();
    if (data) applyViewport(data);
});

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
const CURRENT_VERSION = "4.53.0";
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
